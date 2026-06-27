import re
from typing import Any, Dict, List, Optional


class KnowledgeDataLoader:
    """Adapter around legacy responses plus structured Supper Saiyan topics."""

    def __init__(self, helper: Any):
        self.helper = helper
        self._rebuild_indexes()

    def _rebuild_indexes(self) -> None:
        self._structured_responses = self._flatten_structured_sources()
        self._structured_by_intent = {
            entry.get("intent"): entry
            for entry in self._structured_responses
            if entry.get("intent")
        }
        self._context_index = self._build_context_index()

    def refresh_if_changed(self) -> bool:
        reload_if_changed = getattr(self.helper, "reload_if_changed", None)
        if not callable(reload_if_changed) or not reload_if_changed():
            return False
        self._rebuild_indexes()
        return True

    @property
    def responses(self) -> List[Dict[str, Any]]:
        legacy_intents = {entry.get("intent") for entry in self.helper.responses}
        structured_only = [
            entry for entry in self._structured_responses
            if entry.get("intent") not in legacy_intents
        ]
        return [*self.helper.responses, *structured_only]

    def fallback(self) -> str:
        return self.helper._get_fallback_response()

    def get_response(self, intent: str, user_message: str = "") -> Any:
        if intent in self._structured_by_intent:
            return self._format_entry_response(self._structured_by_intent[intent], user_message)
        return self.helper.get_response(intent, user_message=user_message)

    def get_follow_up(self, last_topic: str) -> List[str]:
        return self.helper.get_follow_up(last_topic)

    def get_location_response(self, location_name: str, user_message: str) -> Dict[str, Any]:
        return self.helper.get_location_response(location_name, user_message)

    def get_building_directory_response(self, user_message: str) -> Optional[Dict[str, Any]]:
        directory_response = getattr(self.helper, "get_building_directory_response", None)
        if callable(directory_response):
            return directory_response(user_message)
        return None

    def get_entry(self, intent: str) -> Optional[Dict[str, Any]]:
        if intent in self._structured_by_intent:
            return self._structured_by_intent[intent]
        return next((entry for entry in self.helper.responses if entry.get("intent") == intent), None)

    @property
    def context_index(self) -> Dict[str, Any]:
        return self._context_index

    def _flatten_structured_sources(self) -> List[Dict[str, Any]]:
        source_names = [
            "library_info",
            "academic_policy",
            "administrators_info",
            "admissions_info",
            "classroom_policy",
            "clinic_info",
            "courses_info",
            "departamentals_faculty_staff",
            "department_info",
            "enrollment_info",
            "facilities_info",
            "ict_info",
            "oss_services",
            "university_info",
            "dormitory_info",
        ]

        records: List[Dict[str, Any]] = []
        for source_name in source_names:
            data_source = getattr(self.helper, source_name, None)
            if isinstance(data_source, dict):
                records.extend(self._flatten_data_source(data_source, source_name))
        return records

    def _flatten_data_source(self, data_source: Dict[str, Any], source_name: str) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
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
                    inherited_context={},
                    topic_lookup=topic_lookup,
                )
            )
        return records

    def _flatten_topic(
        self,
        topic: Dict[str, Any],
        base_intent: str,
        category: str,
        source_name: str,
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
                "category": category,
                "sub_category": full_topic,
                "display_name": topic.get("display_name") or topic.get("ui_name") or "",
                "responses": {
                    "answer": topic.get("responses") or {},
                    "follow_up": topic.get("follow_up") or [],
                    "context_slots": {"last_topic": intent},
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

    def _build_context_index(self) -> Dict[str, Any]:
        subjects: Dict[str, Dict[str, Any]] = {}
        routes: Dict[str, Dict[str, str]] = {}

        for entry in self._structured_responses:
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

        preferred_lang = self.helper.detect_language(user_message)
        selected = answer.get(preferred_lang) if isinstance(answer, dict) else answer
        if not selected and isinstance(answer, dict):
            selected = answer.get("en") or next(iter(answer.values()), [])

        if isinstance(selected, list):
            text_parts = [str(line).strip() for line in selected if str(line).strip()]
            text = "\n".join(text_parts)
        else:
            text = str(selected or "")
            text_parts = [text] if text.strip() else []

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
        preferred_lang = self.helper.detect_language(user_message)
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
            "still have",
            "still has",
            "with slots",
            "with slot",
            "have slots",
            "have slot",
            "have a slot",
            "has slots",
            "has slot",
            "has a slot",
            "available slots",
            "available slot",
            "free slots",
            "free slot",
            "existing slots",
            "existing slot",
            "open slots",
            "open slot",
            "slots available",
            "slot available",
            "remaining slots",
            "remaining slot",
            "slots remaining",
            "slot remaining",
            "naay slots",
            "naay slot",
            "naa slots",
            "naa slot",
            "naay available",
            "naay bakante",
            "naa pay slot",
            "naa pay slots",
            "naa pay mga slot",
            "naa pay mga slots",
            "daghan pag slot",
            "daghan pag slots",
            "naapa slots",
            "naapa slot",
            "naapay slot",
            "naapay slots",
            "naa pa slots",
            "naa pa slot",
            "naa pabay",
            "napay bakanti",
            "naapay bakanti",
            "naapay bakante",
            "naay bakanti",
            "bakanti",
            "bakante",
            "bakante nga slots",
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
            return [str(line).strip() for line in selected_answer if str(line).strip()]
        if selected_answer:
            return [str(selected_answer).strip()]
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
        weak = {
            "the", "is", "are", "under", "course", "courses", "slot", "slots",
            "available", "availability", "left", "open", "sa", "ang", "nga",
            "naay", "naa", "paba", "pa", "may", "mga", "diris", "for", "in",
        }
        return [token for token in re.findall(r"\b[\w'-]+\b", text) if len(token) > 1 and token not in weak]
