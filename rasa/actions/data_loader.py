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
                **context,
                **(topic.get("metadata") or {}),
            }
            records.append({
                "intent": intent,
                "category": category,
                "sub_category": full_topic,
                "responses": {
                    "answer": topic.get("responses") or {},
                    "follow_up": topic.get("follow_up") or [],
                    "context_slots": {"last_topic": intent},
                    "imageUrls": topic.get("imageUrls") or topic.get("images") or [],
                    "mapData": self._map_data_for_topic(topic, full_topic, topic_lookup or {}),
                    "suggestions": topic.get("suggestions") or [],
                    "choiceGroups": topic.get("choiceGroups") or topic.get("choice_groups") or [],
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
