import html
import re
from typing import Any, Dict, List, Optional


class ResponseBuilder:
    """
    Builds clean response payloads compatible with the current frontend.

    Phase 3 owns response quality: text cleanup, exact duplicate removal,
    multi-answer merging, and combined map payloads.
    """

    SECTION_SEPARATOR = "\n\n"

    def clean_text(self, value: Any) -> str:
        """Normalize legacy response text without changing the source data."""
        text = str(value or "")
        if not text.strip():
            return ""

        # Decode common HTML entities and strip raw HTML tags from legacy data.
        text = html.unescape(text)
        text = text.replace("\xa0", " ")
        text = re.sub(r"<\s*(b|strong)\b[^>]*>", "**", text, flags=re.IGNORECASE)
        text = re.sub(r"<\s*/\s*(b|strong)\s*>", "**", text, flags=re.IGNORECASE)
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
        text = re.sub(r"</div\s*>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "", text)

        # Normalize line endings, repeated spaces, and excessive blank lines.
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n[ \t]+", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    def split_sentences(self, text: str) -> List[str]:
        """Split conservatively for exact duplicate sentence cleanup."""
        cleaned = self.clean_text(text)
        if not cleaned:
            return []

        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", cleaned)
        return [part.strip() for part in parts if part.strip()]

    def dedupe_text(self, text: str) -> str:
        """
        Remove exact duplicate lines/sentences while preserving original order.

        This intentionally avoids semantic rewriting. It keeps the response
        trusted and predictable while cleaning obvious repeated content.
        """
        cleaned = self.clean_text(text)
        if not cleaned:
            return ""

        blocks = [block.strip() for block in cleaned.split("\n\n") if block.strip()]
        seen_blocks = set()
        final_blocks = []

        for block in blocks:
            sentences = self.split_sentences(block)
            if len(sentences) <= 1:
                normalized_block = self._dedupe_key(block)
                if normalized_block not in seen_blocks:
                    final_blocks.append(block)
                    seen_blocks.add(normalized_block)
                continue

            seen_sentences = set()
            kept = []
            for sentence in sentences:
                key = self._dedupe_key(sentence)
                if key not in seen_sentences:
                    kept.append(sentence)
                    seen_sentences.add(key)

            new_block = " ".join(kept).strip()
            block_key = self._dedupe_key(new_block)
            if new_block and block_key not in seen_blocks:
                final_blocks.append(new_block)
                seen_blocks.add(block_key)

        return self.SECTION_SEPARATOR.join(final_blocks)

    def _dedupe_key(self, text: str) -> str:
        return re.sub(r"\s+", " ", self.clean_text(text).lower()).strip()

    def build_single_response(self, response: Any) -> List[Dict[str, Any]]:
        if isinstance(response, dict):
            item = dict(response)
            text_parts = item.pop("textParts", None)
            if isinstance(text_parts, list) and text_parts:
                clean_parts = [self.dedupe_text(part) for part in text_parts if self.dedupe_text(part)]
                if clean_parts:
                    items: List[Dict[str, Any]] = []
                    for index, part in enumerate(clean_parts):
                        part_item: Dict[str, Any] = {"text": part}
                        if index == len(clean_parts) - 1:
                            for key, value in item.items():
                                if key != "text":
                                    part_item[key] = value
                        items.append(part_item)
                    return items
            if item.get("text"):
                item["text"] = self.dedupe_text(item["text"])
            return [item]
        return [{"text": self.dedupe_text(response)}]

    def normalize_responses(self, responses: List[Any]) -> List[Dict[str, Any]]:
        normalized = []
        for response in responses:
            normalized.extend(self.build_single_response(response))
        return normalized

    def format_sections(self, responses: List[Any]) -> str:
        seen = set()
        sections = []
        for response in self.normalize_responses(responses):
            text = self.dedupe_text(response.get("text"))
            key = self._dedupe_key(text)
            if text and key not in seen:
                sections.append(text)
                seen.add(key)
        return self.SECTION_SEPARATOR.join(sections)

    def attach_map_payload(self, responses: List[Any]) -> Dict[str, Any]:
        pins = []
        routes = []
        map_id = None
        seen_pins = set()
        seen_routes = set()
        location_names = []

        for response in self.normalize_responses(responses):
            map_data = (response.get("custom") or {}).get("mapData")
            if not isinstance(map_data, dict):
                continue
            map_id = map_id or map_data.get("mapId")
            if map_data.get("locationName"):
                location_name = str(map_data.get("locationName")).strip()
                if location_name and location_name not in location_names:
                    location_names.append(location_name)
            if map_data.get("coordinates") and not map_data.get("pins"):
                coordinate_pin = {
                    "name": map_data.get("locationName") or "Location",
                    "coordinates": map_data.get("coordinates"),
                }
                if map_data.get("floor"):
                    coordinate_pin["floor"] = map_data.get("floor")
                if map_data.get("access"):
                    coordinate_pin["access"] = map_data.get("access")
                if map_data.get("pinType"):
                    coordinate_pin["pinType"] = map_data.get("pinType")
                map_data = {**map_data, "pins": [coordinate_pin]}
            for pin in map_data.get("pins") or []:
                key = (
                    str(pin.get("name") or "").strip().lower(),
                    tuple(pin.get("coordinates") or []),
                    str(pin.get("floor") or "").strip().lower(),
                )
                if key not in seen_pins:
                    pins.append(pin)
                    seen_pins.add(key)
            for route in map_data.get("routes") or []:
                route_key = (
                    str(route.get("name") or "").strip().lower(),
                    tuple(tuple(point) for point in route.get("points") or []),
                )
                if route_key not in seen_routes:
                    routes.append(route)
                    seen_routes.add(route_key)

        if not pins and not routes:
            return {}

        if len(location_names) == 1:
            location_name = location_names[0]
        elif location_names:
            location_name = "Multiple locations: " + ", ".join(location_names[:4])
        else:
            location_name = "Multiple locations" if len(pins) > 1 else "Location"

        return {
            "mapData": {
                "locationName": location_name,
                "mapId": map_id or "main_map",
                "pins": pins,
                "routes": routes,
            }
        }

    def build_multi_response(self, responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not responses:
            return []

        merged = {"text": self.format_sections(responses)}
        map_payload = self.attach_map_payload(responses)
        if map_payload:
            merged["custom"] = map_payload
        return [merged]

    def _first_image(self, item: Dict[str, Any]) -> Optional[str]:
        if item.get("image"):
            return item["image"]
        images = item.get("images")
        if isinstance(images, list):
            return next((img for img in images if img), None)
        return None

    def emit_response(self, dispatcher: Any, response: Any) -> None:
        for item in self.build_single_response(response):
            text = item.get("text") or None
            custom = item.get("custom") or None

            # Send text and map payload together when possible so the frontend
            # receives one coherent answer object for a merged response.
            if text and custom:
                dispatcher.utter_message(text=text, json_message=custom)
            elif text:
                dispatcher.utter_message(text=text)
            elif custom:
                dispatcher.utter_message(json_message=custom)

            if isinstance(item.get("images"), list):
                for img in item.get("images"):
                    if img:
                        dispatcher.utter_message(image=img)
            elif item.get("image"):
                dispatcher.utter_message(image=item["image"])

    def emit_multi_response(self, dispatcher: Any, responses: List[Dict[str, Any]]) -> None:
        for item in self.build_multi_response(responses):
            self.emit_response(dispatcher, item)
