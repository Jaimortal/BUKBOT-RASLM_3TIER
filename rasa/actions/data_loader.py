import glob
import json
import os
import re
from typing import Any, Dict, List, Optional

from domain_registry import DOMAIN_REGISTRY, normalize_domain
from language_detector import detect_language


class KnowledgeDataLoader:
    """
    Domain-Aware Knowledge Data Loader.
    Dynamically loads structured knowledge from `rasa/actions/knowledge/<domain>/*.json`.
    Maintains isolated domain indices for zero-collision retrieval.
    """

    def __init__(self, helper: Optional[Any] = None):
        self.helper = helper
        self.knowledge_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "knowledge")
        self._rebuild_indexes()

    def _rebuild_indexes(self) -> None:
        self._structured_responses_by_domain: Dict[str, List[Dict[str, Any]]] = {
            domain: [] for domain in DOMAIN_REGISTRY
        }
        self._structured_by_intent_by_domain: Dict[str, Dict[str, Dict[str, Any]]] = {
            domain: {} for domain in DOMAIN_REGISTRY
        }
        self._context_index_by_domain: Dict[str, Dict[str, Any]] = {
            domain: {} for domain in DOMAIN_REGISTRY
        }

        self._all_structured_responses: List[Dict[str, Any]] = []
        self._all_structured_by_intent: Dict[str, Dict[str, Any]] = {}

        # Scan each domain folder under knowledge/
        for domain_id, domain_info in DOMAIN_REGISTRY.items():
            domain_folder = os.path.join(self.knowledge_root, domain_info["folder"])
            if not os.path.isdir(domain_folder):
                continue

            for json_path in sorted(glob.glob(os.path.join(domain_folder, "*.json"))):
                source_name = os.path.splitext(os.path.basename(json_path))[0]
                try:
                    with open(json_path, "r", encoding="utf-8") as fp:
                        data_source = json.load(fp)
                    if isinstance(data_source, dict):
                        records = self._flatten_data_source(data_source, source_name, domain_id)
                        self._structured_responses_by_domain[domain_id].extend(records)
                        for r in records:
                            intent = r.get("intent")
                            if intent:
                                self._structured_by_intent_by_domain[domain_id][intent] = r
                                self._all_structured_by_intent[intent] = r
                        self._all_structured_responses.extend(records)
                except Exception as e:
                    print(f"Error loading {json_path}: {e}")

            self._context_index_by_domain[domain_id] = self._build_context_index_for_records(
                self._structured_responses_by_domain[domain_id]
            )

        self._context_index = self._build_context_index_for_records(self._all_structured_responses)

    def refresh_if_changed(self) -> bool:
        reload_if_changed = getattr(self.helper, "reload_if_changed", None)
        if not callable(reload_if_changed) or not reload_if_changed():
            return False
        self._rebuild_indexes()
        return True

    @property
    def responses(self) -> List[Dict[str, Any]]:
        """All combined responses across domains + legacy general responses."""
        if not self.helper or not getattr(self.helper, "responses", None):
            return self._all_structured_responses
        legacy_intents = {entry.get("intent") for entry in self.helper.responses}
        structured_only = [
            entry for entry in self._all_structured_responses
            if entry.get("intent") not in legacy_intents
        ]
        return [*self.helper.responses, *structured_only]

    def get_responses_for_domain(self, domain_id: Optional[str]) -> List[Dict[str, Any]]:
        """Get flattened responses exclusively for a given domain."""
        norm = normalize_domain(domain_id)
        if norm and norm in self._structured_responses_by_domain:
            return self._structured_responses_by_domain[norm]
        return self.responses

    def fallback(self) -> str:
        if self.helper and hasattr(self.helper, "_get_fallback_response"):
            return self.helper._get_fallback_response()
        return "I'm sorry, I couldn't find specific information on that. Please try rephrasing or choose one of the categories."

    def get_response(self, intent: str, user_message: str = "", domain: Optional[str] = None) -> Any:
        norm = normalize_domain(domain)
        if norm and norm in self._structured_by_intent_by_domain:
            if intent in self._structured_by_intent_by_domain[norm]:
                return self._format_entry_response(self._structured_by_intent_by_domain[norm][intent], user_message)
        
        if intent in self._all_structured_by_intent:
            return self._format_entry_response(self._all_structured_by_intent[intent], user_message)
        if self.helper and hasattr(self.helper, "get_location_response") and hasattr(self.helper, "responses_location") and intent in self.helper.responses_location:
            return self.helper.get_location_response(intent, user_message)
        if self.helper and hasattr(self.helper, "get_response"):
            return self.helper.get_response(intent, user_message=user_message)
        return self.fallback()

    def get_follow_up(self, last_topic: str) -> List[str]:
        if self.helper and hasattr(self.helper, "get_follow_up"):
            return self.helper.get_follow_up(last_topic)
        return []

    def get_location_response(self, location_name: str, user_message: str) -> Dict[str, Any]:
        if self.helper and hasattr(self.helper, "get_location_response"):
            return self.helper.get_location_response(location_name, user_message)
        # Search directly in location structured entries
        entry = self.get_entry(location_name, domain="location")
        if not entry:
            entry = self.get_entry(f"location_{location_name.lower().strip().replace(' ', '_')}", domain="location")
        if not entry:
            # Search location domain items by name/subject terms
            norm_target = location_name.lower().strip()
            loc_entries = self._structured_by_intent_by_domain.get("location", {})
            for k, e in loc_entries.items():
                disp = str(e.get("display_name") or "").lower()
                sub = [str(s).lower() for s in e.get("metadata", {}).get("subject_terms", [])]
                if norm_target in k.lower() or norm_target in disp or any(norm_target in s for s in sub):
                    entry = e
                    break
        if entry:
            return self._format_entry_response(entry, user_message)
        return {"text": f"Sorry, I don't have location information for {location_name}."}

    def get_building_directory_response(self, user_message: str) -> Optional[Dict[str, Any]]:
        directory_response = getattr(self.helper, "get_building_directory_response", None)
        if callable(directory_response):
            return directory_response(user_message)
        return None

    def get_entry(self, intent: str, domain: Optional[str] = None) -> Optional[Dict[str, Any]]:
        norm = normalize_domain(domain)
        if norm and norm in self._structured_by_intent_by_domain:
            if intent in self._structured_by_intent_by_domain[norm]:
                return self._structured_by_intent_by_domain[norm][intent]
        if intent in self._all_structured_by_intent:
            return self._all_structured_by_intent[intent]
        if self.helper and getattr(self.helper, "responses", None):
            return next((entry for entry in self.helper.responses if entry.get("intent") == intent), None)
        return None

    def is_intent_in_domain(self, intent_name: str, domain_id: Optional[str]) -> bool:
        if not domain_id or not intent_name:
            return True
        if str(intent_name).startswith("__"):
            return True
        norm = normalize_domain(domain_id)
        if not norm:
            return True
        if norm in self._structured_by_intent_by_domain:
            return intent_name in self._structured_by_intent_by_domain[norm]
        return True

    @property
    def context_index(self) -> Dict[str, Any]:
        return self._context_index

    def get_context_index_for_domain(self, domain_id: Optional[str]) -> Dict[str, Any]:
        norm = normalize_domain(domain_id)
        if norm and norm in self._context_index_by_domain:
            return self._context_index_by_domain[norm]
        return self._context_index

    def _flatten_data_source(self, data_source: Dict[str, Any], source_name: str, domain_id: str) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []

        # Handle location database format {"locations": {...}}
        if "locations" in data_source and isinstance(data_source["locations"], dict):
            for loc_name, loc_data in data_source["locations"].items():
                if isinstance(loc_data, dict):
                    records.append(self._flatten_location_entry(loc_name, loc_data, source_name, domain_id))
            return records

        base_intent = data_source.get("intent") or source_name
        category = data_source.get("category") or source_name.replace("_", " ")
        topic_lookup = self._topic_lookup(data_source)

        for topic in data_source.get("topics", []):
            records.extend(
                self._flatten_topic(
                    topic=topic,
                    base_intent=base_intent,
                    category=category,
                    source_name=source_name,
                    domain_id=domain_id,
                    inherited_context={},
                    topic_lookup=topic_lookup,
                )
            )
        return records

    def _flatten_location_entry(self, loc_name: str, loc_data: Dict[str, Any], source_name: str, domain_id: str) -> Dict[str, Any]:
        intent = f"location_{loc_name.replace(' ', '_').replace('-', '_')}"
        raw_responses = loc_data.get("responses") or {}
        return {
            "intent": intent,
            "domain": domain_id,
            "category": "Location",
            "sub_category": loc_name,
            "display_name": loc_name,
            "responses": {
                "answer": raw_responses,
                "follow_up": [],
                "context_slots": {"last_topic": loc_name, "active_category": domain_id},
                "imageUrls": loc_data.get("images") or loc_data.get("imageUrls") or [],
                "mapData": {
                    "locationName": loc_name,
                    "mapId": loc_data.get("map_id", "main_map"),
                    "floor": loc_data.get("floor", ""),
                    "building": loc_data.get("building", ""),
                    "type": loc_data.get("type", ""),
                    "pins": loc_data.get("pins", []),
                    "routes": loc_data.get("routes", []),
                },
                "suggestions": [],
            },
            "metadata": {
                "source": source_name,
                "domain": domain_id,
                "structured_source": True,
                "topic": "location",
                "display_name": loc_name,
                "subject_terms": [loc_name, loc_data.get("building", ""), loc_data.get("type", "")],
                "phrases": [f"where is {loc_name}", f"location of {loc_name}", f"how to go to {loc_name}"],
            },
        }

    def _flatten_topic(
        self,
        topic: Dict[str, Any],
        base_intent: str,
        category: str,
        source_name: str,
        domain_id: str,
        parent_topic: Optional[str] = None,
        inherited_context: Optional[Dict[str, Any]] = None,
        topic_lookup: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        inherited_context = inherited_context or {}
        topic_key = topic.get("topic") or "general"
        full_topic = f"{parent_topic}_{topic_key}" if parent_topic else topic_key
        context = {
            **inherited_context,
            **self._topic_context(topic, category, source_name),
        }

        if topic.get("responses"):
            intent = topic.get("intent") or f"{base_intent}_{full_topic}".replace("-", "_")
            metadata = {
                "source": source_name,
                "domain": domain_id,
                "structured_source": True,
                "base_intent": base_intent,
                "topic": topic_key,
                "parent_topic": parent_topic,
                "display_name": topic.get("display_name") or topic.get("ui_name") or "",
                **context,
                **(topic.get("metadata") or {}),
            }
            records.append({
                "intent": intent,
                "domain": domain_id,
                "category": category,
                "sub_category": full_topic,
                "display_name": topic.get("display_name") or topic.get("ui_name") or "",
                "responses": {
                    "answer": topic.get("responses") or {},
                    "follow_up": topic.get("follow_up") or [],
                    "context_slots": {"last_topic": intent, "active_category": domain_id},
                    "imageUrls": topic.get("imageUrls") or topic.get("images") or [],
                    "mapData": self._map_data_for_topic(topic, full_topic, topic_lookup or {}),
                    "suggestions": topic.get("suggestions") or [],
                    "choiceGroups": topic.get("choiceGroups") or topic.get("choice_groups") or [],
                    "items": topic.get("items") or [],
                    "itemGroups": topic.get("itemGroups") or topic.get("item_groups") or {},
                    "itemDisclaimer": topic.get("itemDisclaimer") or topic.get("item_disclaimer") or "",
                },
                "metadata": metadata,
            })

        for subtopic in topic.get("subtopics", []):
            records.extend(
                self._flatten_topic(
                    topic=subtopic,
                    base_intent=base_intent,
                    category=category,
                    source_name=source_name,
                    domain_id=domain_id,
                    parent_topic=full_topic,
                    inherited_context=context,
                    topic_lookup=topic_lookup,
                )
            )

        return records

    def _topic_lookup(self, data_source: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        lookup: Dict[str, Dict[str, Any]] = {}

        def collect(topic: Dict[str, Any]) -> None:
            if not isinstance(topic, dict):
                return
            topic_key = topic.get("topic")
            intent = topic.get("intent")
            if topic_key:
                lookup[str(topic_key)] = topic
            if intent:
                lookup[str(intent)] = topic
            for subtopic in topic.get("subtopics") or []:
                collect(subtopic)

        for topic in data_source.get("topics") or []:
            collect(topic)
        return lookup

    def _map_data_for_topic(
        self,
        topic: Dict[str, Any],
        full_topic: str,
        topic_lookup: Dict[str, Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        map_ref = topic.get("mapRef") or topic.get("map_ref")
        if map_ref and map_ref in topic_lookup:
            referenced = topic_lookup[map_ref]
            return self._map_data_for_topic(referenced, str(map_ref), {})

        if isinstance(topic.get("mapData"), dict):
            return topic.get("mapData")

        pins = topic.get("pins") if isinstance(topic.get("pins"), list) else []
        routes = topic.get("routes") if isinstance(topic.get("routes"), list) else []
        map_info = topic.get("map") if isinstance(topic.get("map"), dict) else {}

        if not pins and not routes and not map_info:
            return None

        normalized_pins = []
        for pin in pins:
            if not isinstance(pin, dict):
                continue
            coordinates = self._coordinates_from(pin)
            if not coordinates:
                continue
            normalized_pins.append({
                **pin,
                "coordinates": coordinates,
            })

        normalized_routes = []
        for route in routes:
            if not isinstance(route, dict):
                continue
            points = route.get("points") or []
            if not isinstance(points, list):
                continue
            normalized_points = [
                point for point in points
                if isinstance(point, list) and len(point) >= 2
            ]
            if len(normalized_points) < 2:
                continue
            normalized_routes.append({
                **route,
                "points": normalized_points,
            })

        center = self._coordinates_from(map_info)
        location_name = (
            topic.get("locationName") or
            topic.get("location_name") or
            str(full_topic).replace("_", " ").title()
        )

        map_data: Dict[str, Any] = {
            "locationName": location_name,
            "mapId": topic.get("mapId") or map_info.get("mapId") or "main_map",
            "pins": normalized_pins,
            "routes": normalized_routes,
        }
        if center:
            map_data["coordinates"] = center

        return map_data

    def _coordinates_from(self, value: Dict[str, Any]) -> Optional[List[float]]:
        if not isinstance(value, dict):
            return None

        raw_coordinates = value.get("coordinates")
        if isinstance(raw_coordinates, list) and len(raw_coordinates) >= 2:
            try:
                y_number = float(raw_coordinates[0])
                x_number = float(raw_coordinates[1])
                return [y_number, x_number]
            except (TypeError, ValueError):
                return None

        lat = value.get("lat", value.get("latitude", value.get("y")))
        lng = value.get("lng", value.get("longitude", value.get("x")))
        try:
            lat_number = float(lat)
            lng_number = float(lng)
        except (TypeError, ValueError):
            return None

        return [lat_number, lng_number]

    def _topic_context(self, topic: Dict[str, Any], category: str, source_name: str) -> Dict[str, Any]:
        context: Dict[str, Any] = {}
        if topic.get("subject_key"):
            context["subject_key"] = topic.get("subject_key")
            context["subject_type"] = topic.get("subject_type") or "topic"
            context["subject_category"] = topic.get("subject_category") or source_name
            context["subject_terms"] = topic.get("subject_terms") or []
        if topic.get("context_topic"):
            context["context_topic"] = topic.get("context_topic")
        elif topic.get("topic"):
            context["context_topic"] = topic.get("topic")
        return context

    def _build_context_index_for_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        subjects: Dict[str, Dict[str, Any]] = {}
        routes: Dict[str, Dict[str, str]] = {}

        for entry in records:
            metadata = entry.get("metadata", {})
            subject_key = metadata.get("subject_key")
            if not subject_key:
                continue

            subjects.setdefault(subject_key, {
                "subject": subject_key,
                "subject_type": metadata.get("subject_type") or "topic",
                "category": metadata.get("subject_category") or metadata.get("source"),
                "terms": metadata.get("subject_terms") or [],
                "intent_prefixes": [str(subject_key)],
            })
            entry_intent = entry.get("intent")
            if entry_intent and entry_intent not in subjects[subject_key]["intent_prefixes"]:
                subjects[subject_key]["intent_prefixes"].append(entry_intent)

            purpose_intent = self._purpose_intent_for_topic(metadata.get("context_topic") or metadata.get("topic"))
            if purpose_intent:
                routes.setdefault(subject_key, {})[purpose_intent] = entry.get("intent")

        return {
            "subjects": list(subjects.values()),
            "routes": routes,
        }

    def _purpose_intent_for_topic(self, topic: Optional[str]) -> Optional[str]:
        topic = str(topic or "").lower().strip()
        if topic in {"location", "where"}:
            return "ask_location"
        if topic in {"requirements", "requirement", "documents", "eligibility"}:
            return "ask_requirement"
        if topic in {"payment", "fee", "fees"}:
            return "ask_fee"
        if topic in {"process", "steps", "how", "solution"}:
            return "ask_process"
        if topic in {"form", "forms", "document"}:
            return "ask_document"
        if topic in {"schedule", "hours", "time"}:
            return "ask_schedule"
        if topic in {"contact"}:
            return "ask_contact"
        if topic in {"availability"}:
            return "ask_availability"
        if topic in {"meaning", "definition", "policy", "overview", "info", "consequences", "person"}:
            return "ask_general_info"
        return None

    def _format_entry_response(self, entry: Dict[str, Any], user_message: str = "") -> Dict[str, Any]:
        responses_data = entry.get("responses", {})
        if responses_data.get("items"):
            return self._format_item_level_response(responses_data, user_message)

        answer = responses_data.get("answer", {})

        detector = getattr(self.helper, "detect_language", None) or detect_language
        preferred_lang = detector(user_message) if callable(detector) else "en"
        selected = answer.get(preferred_lang) if isinstance(answer, dict) else answer
        if not selected and isinstance(answer, dict):
            selected = answer.get("en") or next(iter(answer.values()), [])

        if isinstance(selected, list):
            text_parts = [
                re.sub(r"\n{2,}", "\n\u200b\n", str(line).strip())
                for line in selected
                if str(line).strip()
            ]
            text = "\n".join(text_parts)
        else:
            text = re.sub(r"\n{2,}", "\n\u200b\n", str(selected or "").strip())
            text_parts = [text] if text else []

        result: Dict[str, Any] = {"text": text}
        if len(text_parts) > 1:
            result["textParts"] = text_parts

        image_urls = responses_data.get("imageUrls") or []
        if image_urls:
            result["images"] = image_urls
            result["image"] = image_urls[0]

        custom: Dict[str, Any] = {}
        if responses_data.get("mapData"):
            custom["mapData"] = responses_data["mapData"]
        if responses_data.get("suggestions"):
            custom["suggestions"] = responses_data["suggestions"]
        if responses_data.get("choiceGroups"):
            custom["choiceGroups"] = responses_data["choiceGroups"]
        if custom:
            result["custom"] = custom

        return result

    def _format_item_level_response(self, responses_data: Dict[str, Any], user_message: str = "") -> Dict[str, Any]:
        answer = responses_data.get("answer", {})
        items = [item for item in responses_data.get("items") or [] if isinstance(item, dict)]
        item_groups = responses_data.get("itemGroups") or {}
        disclaimer = str(responses_data.get("itemDisclaimer") or "").strip()
        detector = getattr(self.helper, "detect_language", None) or detect_language
        preferred_lang = detector(user_message) if callable(detector) else "en"
        selected_answer = answer.get(preferred_lang) if isinstance(answer, dict) else answer
        if not selected_answer and isinstance(answer, dict):
            selected_answer = answer.get("en") or next(iter(answer.values()), [])

        selected_items = self._matching_items(items, user_message)
        matched_groups = self._matching_item_groups(items, item_groups, user_message)
        wants_available_slots_only = self._wants_available_slot_items(user_message)

        if selected_items:
            text_parts = (
                [self._item_line(selected_items[0])]
                if len(selected_items) == 1
                else self._item_lines_by_group(selected_items, item_groups, generic_header="Here are the matching course slots:")
            )
            displayed_items = selected_items
        elif matched_groups:
            grouped_items = [item for item in items if str(item.get("group") or "").upper() in matched_groups]
            if wants_available_slots_only:
                grouped_items = [item for item in grouped_items if self._numeric_slot_count(item) >= 1]
            text_parts = self._item_lines_by_group(grouped_items, item_groups, include_group_headers=True)
            if wants_available_slots_only and not text_parts:
                text_parts = ["I do not have any numeric available slot data for that selected group right now."]
            displayed_items = grouped_items
        elif wants_available_slots_only:
            available_items = [item for item in items if self._numeric_slot_count(item) >= 1]
            text_parts = self._item_lines_by_group(
                available_items,
                item_groups,
                generic_header="Here are the courses that still have available slots:"
            )
            if not text_parts:
                text_parts = ["I do not have any courses with numeric available slots right now."]
            displayed_items = available_items
        else:
            text_parts = self._answer_parts(selected_answer)
            text_parts.extend(self._item_lines_by_group(items, item_groups, include_group_headers=True))
            displayed_items = items

        if disclaimer and self._should_include_item_disclaimer(displayed_items):
            text_parts.append(disclaimer)

        text_parts = [part for part in text_parts if str(part).strip()]
        result: Dict[str, Any] = {"text": "\n".join(text_parts)}
        if len(text_parts) > 1:
            result["textParts"] = text_parts

        custom: Dict[str, Any] = {}
        if responses_data.get("suggestions"):
            custom["suggestions"] = responses_data["suggestions"]
        if responses_data.get("choiceGroups"):
            custom["choiceGroups"] = responses_data["choiceGroups"]
        if custom:
            result["custom"] = custom
        return result

    def _should_include_item_disclaimer(self, items: List[Dict[str, Any]]) -> bool:
        for item in items:
            value = str(item.get("value") or "").strip().lower()
            if re.search(r"\b\d+\s*slots?\b", value):
                return True
        return False

    def _wants_available_slot_items(self, user_message: str) -> bool:
        query = self._normalize_item_text(user_message)
        if not re.search(r"\bslots?\b", query) and not re.search(r"\bbakant[ei]\b", query):
            return False
        available_terms = [
            "still have", "still has", "with slots", "with slot", "have slots", "have slot",
            "have a slot", "has slots", "has slot", "has a slot", "available slots", "available slot",
            "free slots", "free slot", "existing slots", "existing slot", "open slots", "open slot",
            "slots available", "slot available", "remaining slots", "remaining slot", "slots remaining",
            "slot remaining", "naay slots", "naay slot", "naa slots", "naa slot", "naay available",
            "naay bakante", "naa pay slot", "naa pay slots", "naa pay mga slot", "naa pay mga slots",
            "daghan pag slot", "daghan pag slots", "naapa slots", "naapa slot", "naapay slot",
            "naapay slots", "naa pa slots", "naa pa slot", "naa pabay", "napay bakanti",
            "naapay bakanti", "naapay bakante", "naay bakanti", "bakanti", "bakante", "bakante nga slots",
        ]
        return any(term in query for term in available_terms)

    def _numeric_slot_count(self, item: Dict[str, Any]) -> int:
        value = str(item.get("value") or "").strip().lower()
        match = re.search(r"\b(\d+)\s*slots?\b", value)
        if not match:
            return 0
        try:
            return int(match.group(1))
        except ValueError:
            return 0

    def _answer_parts(self, selected_answer: Any) -> List[str]:
        if isinstance(selected_answer, list):
            return [re.sub(r"\n{2,}", "\n\u200b\n", str(line).strip()) for line in selected_answer if str(line).strip()]
        if selected_answer:
            return [re.sub(r"\n{2,}", "\n\u200b\n", str(selected_answer).strip())]
        return []

    def _item_lines_by_group(
        self,
        items: List[Dict[str, Any]],
        item_groups: Dict[str, Any],
        generic_header: str = "",
        include_group_headers: bool = False,
    ) -> List[str]:
        if not items:
            return []

        if len(items) == 1 and not include_group_headers and not generic_header:
            return [self._item_line(items[0])]

        lines: List[str] = []
        if generic_header:
            lines.append(generic_header)

        grouped: Dict[str, List[Dict[str, Any]]] = {}
        group_order: List[str] = []
        for item in items:
            group = str(item.get("group") or "Other").upper()
            if group not in grouped:
                grouped[group] = []
                group_order.append(group)
            grouped[group].append(item)

        for group in group_order:
            header = self._group_header(group, item_groups)
            if include_group_headers or len(group_order) > 1 or not generic_header:
                if header:
                    lines.append(header)
            lines.extend(self._item_line(item) for item in grouped[group])
        return lines

    def _item_line(self, item: Dict[str, Any]) -> str:
        text = str(item.get("text") or "").strip()
        if text:
            return text
        name = str(item.get("name") or item.get("key") or "").strip()
        value = str(item.get("value") or "").strip()
        return f"{name}: {value}" if value else name

    def _group_header(self, group: str, item_groups: Dict[str, Any]) -> str:
        group_data = item_groups.get(group) or item_groups.get(group.lower()) or {}
        if isinstance(group_data, dict):
            return str(group_data.get("header") or group_data.get("name") or group).strip()
        return str(group_data or group).strip()

    def _matching_items(self, items: List[Dict[str, Any]], user_message: str) -> List[Dict[str, Any]]:
        query = self._normalize_item_text(user_message)
        query_tokens = set(self._item_tokens(query))
        matches: List[Dict[str, Any]] = []
        for item in items:
            aliases = [
                item.get("key"),
                item.get("name"),
                item.get("display_name"),
                item.get("text"),
                *(item.get("aliases") or []),
                *(item.get("search_terms") or []),
                *(item.get("searchTerms") or []),
            ]
            if self._matches_any_alias(query, query_tokens, aliases):
                matches.append(item)
        return matches

    def _matching_item_groups(
        self,
        items: List[Dict[str, Any]],
        item_groups: Dict[str, Any],
        user_message: str,
    ) -> List[str]:
        query = self._normalize_item_text(user_message)
        matched: List[str] = []
        groups = {str(item.get("group") or "").upper() for item in items if item.get("group")}
        for group in groups:
            group_data = item_groups.get(group) or item_groups.get(group.lower()) or {}
            aliases = [group]
            if isinstance(group_data, dict):
                aliases.extend(group_data.get("aliases") or [])
                aliases.extend(group_data.get("search_terms") or [])
                aliases.extend(group_data.get("searchTerms") or [])
                aliases.append(group_data.get("name"))
                aliases.append(group_data.get("header"))
            elif group_data:
                aliases.append(group_data)
            if self._matches_any_alias(query, set(self._item_tokens(query)), aliases):
                matched.append(group)
        return matched

    def _matches_any_alias(self, query: str, query_tokens: set, aliases: List[Any]) -> bool:
        for alias in aliases:
            normalized_alias = self._normalize_item_text(str(alias or ""))
            if not normalized_alias:
                continue
            if re.search(rf"(?<!\w){re.escape(normalized_alias)}(?!\w)", query):
                return True
            alias_tokens = set(self._item_tokens(normalized_alias))
            if len(alias_tokens) >= 2 and alias_tokens.issubset(query_tokens):
                return True
        return False

    def _normalize_item_text(self, text: str) -> str:
        normalized = str(text or "").lower()
        normalized = normalized.replace("&", " and ")
        normalized = re.sub(r"[^a-z0-9\s'-]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _item_tokens(self, text: str) -> List[str]:
        weak = {"the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or", "sa", "ug", "ang", "nga"}
        return [token for token in re.findall(r"\b[\w'-]+\b", text) if len(token) > 1 and token not in weak]

    def is_intent_in_domain(self, intent_name: str, domain: Optional[str]) -> bool:
        """Checks if a given intent/topic belongs to the specified domain."""
        if not domain or not intent_name:
            return True
        if str(intent_name).startswith("__"):
            return True
        from domain_registry import normalize_domain
        norm_domain = normalize_domain(domain)
        if not norm_domain:
            return True
        
        # Check structured topic index
        domain_structured = self._structured_by_intent_by_domain.get(norm_domain, {})
        if intent_name in domain_structured:
            return True
        
        # Check context index
        domain_context = self._context_index_by_domain.get(norm_domain, {})
        if intent_name in domain_context:
            return True
        
        # Check location prefix
        if norm_domain == "location" and (intent_name.startswith("location_") or intent_name == "ask_location"):
            return True

        return False

