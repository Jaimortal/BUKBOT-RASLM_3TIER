import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


@dataclass
class KnowledgeRecord:
    id: str
    source: str
    path: str
    intent: str
    display_name: str
    topic: str
    parent_topic: str = ""
    category: str = ""
    subject_terms: List[str] = field(default_factory=list)
    phrases: List[str] = field(default_factory=list)
    responses: Dict[str, List[str]] = field(default_factory=dict)
    suggestions: List[Dict[str, Any]] = field(default_factory=list)
    choice_groups: List[Dict[str, Any]] = field(default_factory=list)
    images: List[str] = field(default_factory=list)
    map_data: Optional[Dict[str, Any]] = None

    def answer_lines(self, lang: str = "en") -> List[str]:
        preferred = self.responses.get(lang) or self.responses.get("en") or []
        if isinstance(preferred, list):
            return [str(line).strip() for line in preferred if str(line).strip()]
        if preferred:
            return [str(preferred).strip()]
        return []

    def compact_answer(self, lang: str = "en", max_chars: int = 420) -> str:
        text = " ".join(self.answer_lines(lang))
        return text[:max_chars].strip()


class KnowledgeLoader:
    def __init__(self, project_root: Path, config: Dict[str, Any]):
        self.project_root = project_root
        self.config = config

    def load(self) -> List[KnowledgeRecord]:
        records: List[KnowledgeRecord] = []
        for source in self.config.get("knowledge_sources", []):
            source_path = self.project_root / source
            if source_path.is_dir():
                for file_path in sorted(source_path.glob("*.json")):
                    records.extend(self._load_json_file(file_path))
            elif source_path.is_file():
                records.extend(self._load_json_file(source_path))
        return records

    def _load_json_file(self, file_path: Path) -> List[KnowledgeRecord]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:
            return []

        rel_source = str(file_path.relative_to(self.project_root)).replace("\\", "/")
        if isinstance(data, dict) and isinstance(data.get("topics"), list):
            return self._flatten_structured(data, rel_source)
        if isinstance(data, dict):
            return self._flatten_location_dict(data, rel_source)
        if isinstance(data, list):
            return self._flatten_legacy_list(data, rel_source)
        return []

    def _flatten_structured(self, data: Dict[str, Any], source: str) -> List[KnowledgeRecord]:
        records: List[KnowledgeRecord] = []
        category = str(data.get("category") or data.get("intent") or source)
        base_intent = str(data.get("intent") or Path(source).stem)

        def walk(topic: Dict[str, Any], indexes: List[int], parent: Dict[str, Any] = None, parent_key: str = "") -> None:
            topic_key = str(topic.get("topic") or f"topic_{indexes[-1] if indexes else 0}")
            full_topic = f"{parent_key}_{topic_key}" if parent_key else topic_key
            responses = self._responses_from(topic.get("responses"))
            has_answer = bool(responses.get("en") or responses.get("ceb"))
            if has_answer:
                intent = str(topic.get("intent") or f"{base_intent}_{full_topic}".replace("-", "_"))
                record_id = f"{source}:{'.'.join(map(str, indexes))}:{intent}"
                metadata = topic.get("metadata") if isinstance(topic.get("metadata"), dict) else {}
                records.append(
                    KnowledgeRecord(
                        id=record_id,
                        source=source,
                        path=".".join(map(str, indexes)),
                        intent=intent,
                        display_name=str(topic.get("display_name") or topic.get("ui_name") or intent).strip(),
                        topic=topic_key,
                        parent_topic=str(parent.get("topic") if parent else ""),
                        category=category,
                        subject_terms=self._string_list(topic.get("subject_terms") or (parent or {}).get("subject_terms")),
                        phrases=self._string_list(metadata.get("phrases")),
                        responses=responses,
                        suggestions=self._list(topic.get("suggestions")),
                        choice_groups=self._list(topic.get("choiceGroups") or topic.get("choice_groups")),
                        images=self._string_list(topic.get("images") or topic.get("imageUrls")),
                        map_data=self._map_data(topic),
                    )
                )

            for child_index, child in enumerate(topic.get("subtopics") or []):
                if isinstance(child, dict):
                    walk(child, [*indexes, child_index], topic, full_topic)

        for index, topic in enumerate(data.get("topics") or []):
            if isinstance(topic, dict):
                walk(topic, [index])
        return records

    def _flatten_location_dict(self, data: Dict[str, Any], source: str) -> List[KnowledgeRecord]:
        records: List[KnowledgeRecord] = []
        for key, value in data.items():
            if not isinstance(value, dict):
                continue
            responses = self._responses_from(value.get("responses"))
            if not responses.get("en") and not responses.get("ceb"):
                continue
            record_id = f"{source}:{key}"
            records.append(
                KnowledgeRecord(
                    id=record_id,
                    source=source,
                    path=key,
                    intent=str(value.get("intent") or key),
                    display_name=str(value.get("display_name") or value.get("locationName") or key),
                    topic=str(key),
                    category="location",
                    subject_terms=[str(key), str(value.get("building") or "")],
                    phrases=[],
                    responses=responses,
                    images=self._string_list(value.get("images") or value.get("imageUrls")),
                    map_data=self._map_data(value),
                )
            )
        return records

    def _flatten_legacy_list(self, data: List[Any], source: str) -> List[KnowledgeRecord]:
        records: List[KnowledgeRecord] = []
        for index, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            responses_block = item.get("responses") if isinstance(item.get("responses"), dict) else {}
            responses = self._responses_from(responses_block.get("answer") or item.get("responses"))
            if not responses.get("en") and not responses.get("ceb"):
                continue
            intent = str(item.get("intent") or f"legacy_{index}")
            records.append(
                KnowledgeRecord(
                    id=f"{source}:{index}:{intent}",
                    source=source,
                    path=str(index),
                    intent=intent,
                    display_name=str(item.get("display_name") or item.get("sub_category") or intent),
                    topic=str(item.get("sub_category") or intent),
                    category=str(item.get("category") or "legacy"),
                    subject_terms=[],
                    phrases=self._string_list((item.get("metadata") or {}).get("phrases") if isinstance(item.get("metadata"), dict) else []),
                    responses=responses,
                    suggestions=self._list(responses_block.get("suggestions")),
                    choice_groups=self._list(responses_block.get("choiceGroups")),
                    images=self._string_list(responses_block.get("imageUrls")),
                    map_data=responses_block.get("mapData") if isinstance(responses_block.get("mapData"), dict) else None,
                )
            )
        return records

    def _responses_from(self, value: Any) -> Dict[str, List[str]]:
        if not isinstance(value, dict):
            return {}
        result: Dict[str, List[str]] = {}
        for lang in ("en", "ceb"):
            raw = value.get(lang)
            if isinstance(raw, list):
                result[lang] = [str(line) for line in raw]
            elif raw:
                result[lang] = [str(raw)]
        return result

    def _map_data(self, topic: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if isinstance(topic.get("mapData"), dict):
            return topic.get("mapData")
        pins = topic.get("pins") if isinstance(topic.get("pins"), list) else []
        routes = topic.get("routes") if isinstance(topic.get("routes"), list) else []
        map_info = topic.get("map") if isinstance(topic.get("map"), dict) else {}
        if not pins and not routes and not map_info:
            return None
        payload = {
            "locationName": topic.get("locationName") or topic.get("display_name") or topic.get("topic") or "Location",
            "mapId": topic.get("mapId") or map_info.get("mapId") or "main_map",
            "pins": pins,
            "routes": routes,
        }
        coords = self._coordinates_from(map_info)
        if coords:
            payload["coordinates"] = coords
        return payload

    def _coordinates_from(self, value: Dict[str, Any]) -> Optional[List[float]]:
        if not isinstance(value, dict):
            return None
        if isinstance(value.get("coordinates"), list) and len(value["coordinates"]) >= 2:
            return [value["coordinates"][0], value["coordinates"][1]]
        lat = value.get("lat", value.get("y"))
        lng = value.get("lng", value.get("x"))
        if lat is None or lng is None:
            return None
        return [lat, lng]

    def _string_list(self, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    def _list(self, value: Any) -> List[Any]:
        return value if isinstance(value, list) else []

