import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set


@dataclass
class ResolvedEntities:
    values: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)
    subject_text: str = ""


class EntityResolver:
    """Resolves Rasa entities, aliases, and room-code-like locations."""

    ENTITY_NAMES = {
        "location_name", "service", "office", "document", "program",
        "organization", "time_period", "topic", "lab_number",
    }

    def __init__(self, location_aliases: Dict[str, str]):
        self.location_aliases = location_aliases

    @staticmethod
    def normalize_text(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "").lower()).strip()

    def normalize_location_name(self, raw_name: str) -> str:
        if not raw_name:
            return raw_name

        cleaned = self.normalize_text(raw_name)
        cleaned = re.sub(r"[^\w\s-]", "", cleaned).strip()
        cleaned = re.sub(r"^\s*(room|rm|the)\s+", "", cleaned).strip()
        cleaned = re.sub(r"\s+(and|ug|or)$", "", cleaned).strip()
        return self.location_aliases.get(cleaned, raw_name)

    def _add_location(self, locations: List[str], seen: Set[str], value: str) -> None:
        normalized = self.normalize_location_name(value)
        key = self.normalize_text(normalized)
        if key and key not in seen:
            locations.append(normalized)
            seen.add(key)

    def locations_from_text(self, text: str) -> List[str]:
        normalized_text = self.normalize_text(text)
        found: List[str] = []
        seen: Set[str] = set()

        matches = []
        for alias, canonical in self.location_aliases.items():
            if not alias:
                continue
            pattern = rf"(?<!\w){re.escape(alias.lower())}(?!\w)"
            match = re.search(pattern, normalized_text)
            if match:
                matches.append((match.start(), match.end(), len(alias), canonical))

        used_spans = []
        for start, end, _, canonical in sorted(matches, key=lambda item: (item[0], -item[2])):
            if any(start < used_end and end > used_start for used_start, used_end in used_spans):
                continue
            used_spans.append((start, end))
            self._add_location(found, seen, canonical)

        for match in re.finditer(r"\b([a-zA-Z]\d*)\s+(\d+)\s+(\d{1,2})\b", normalized_text):
            building, floor, room = match.group(1), match.group(2), match.group(3)
            self._add_location(found, seen, f"{building}-{floor}-{room.zfill(2)}".upper())

        for match in re.finditer(r"\b([a-zA-Z]\d*)-(\d+)-(\d{1,2})\b", normalized_text):
            building, floor, room = match.group(1), match.group(2), match.group(3)
            self._add_location(found, seen, f"{building}-{floor}-{room.zfill(2)}".upper())

        for match in re.finditer(r"\b([a-zA-Z])[- ]*(\d)[- ]*(\d)[- ]*(\d{1,2})\b", normalized_text):
            b_prefix, b_num, floor, room = match.group(1), match.group(2), match.group(3), match.group(4)
            self._add_location(found, seen, f"{b_prefix.upper()}{b_num}-{floor}-{room.zfill(2)}")

        return found

    def _filter_conflicting_locations(self, locations: List[str]) -> List[str]:
        """Prefer exact office/room targets over broad college/building aliases.

        Rasa can extract a broad entity like "COT" while the alias matcher also
        resolves "COT Faculty Room". Keeping both makes the response merge the
        building answer with the specific room answer. This filter keeps the
        more specific target for office/room/window queries.
        """
        normalized = {self.normalize_text(location): location for location in locations}
        remove: Set[str] = set()

        def has(name: str) -> bool:
            return self.normalize_text(name) in normalized

        def drop(name: str) -> None:
            key = self.normalize_text(name)
            if key in normalized:
                remove.add(key)

        if has("COT Faculty Room") or has("COT Dean's Office") or has("Electronics Faculty Room") or has("Food Technology Faculty Room"):
            drop("COT Buildings")
            drop("New COT Building")
            drop("Old COT Building")
            drop("Dean's Office")
            drop("Deans Office")
        if has("BSN Faculty Room") or has("CON Dean's Office"):
            drop("College of Nursing Building")
        cas_specific_rooms = [
            "CAS Deans Office", "Philosophy Faculty Office", "CAS SBO Office",
            "Microbiology Laboratory", "Biotechnology Laboratory",
            "Plant Tissue Culture Laboratory", "Kalatungan Learning Space",
            "Sociology Department", "Economics Department", "ODeL Office",
            "language and literature department", "NC4-A4-401", "NC4-A4-402",
            "A3-1-01", "A3-1-02", "College of Arts and Sciences Records Office",
            "Mathematics Department Faculty Room 2",
            "A3-1-05", "A3-1-06", "SSD Research Room",
            "A3-2-01", "A3-2-02", "A3-2-03", "A3-2-04", "A3-2-05", "A3-2-06",
            "A1-3-01", "A1-3-02", "A1-3-03", "A1-3-04",
            "DevCom Department Faculty Room", "Natural Science Faculty Room",
            "Mathematics Faculty Room (Pink Building)", "CAS Guidance Office",
            "CAS Research Extension Unit", "Scholarship and Financial Grants Unit",
            "Academic Mentoring Unit"
        ]
        if any(has(r) for r in cas_specific_rooms):
            drop("CAS Buildings")
            drop("pink building")
        if has("COB SBO Office"):
            drop("COB Building")
        if has("COT SBO Office"):
            drop("COT Buildings")
            drop("New COT Building")
            drop("Old COT Building")
        if has("CPAG Faculty Room") or has("CPAG Deans Office") or has("GE Department") or has("CPAG SBO Office"):
            drop("CPAG building")
        if has("NC4-A4-401"):
            drop("A4-4-01")
        if has("NC4-A4-402"):
            drop("A4-4-02")
        if has("Window 8 Payroll Regular and Casual"):
            drop("Window 7 Payroll Regular")
        if has("Windows 3 Assessment") or has("Windows 4 Assessment") or has("Windows 5 Assessment") or has("Window 8 Payroll Regular and Casual"):
            drop("Finance Building")

        return [location for location in locations if self.normalize_text(location) not in remove]

    def resolve(self, latest_message: Dict[str, Any], user_text: str) -> ResolvedEntities:
        values: List[str] = []
        locations: List[str] = []
        seen_locations: Set[str] = set()

        for entity in latest_message.get("entities", []):
            if entity.get("entity") not in self.ENTITY_NAMES:
                continue
            value = str(entity.get("value") or "").strip()
            if not value:
                continue
            values.append(value)
            if entity.get("entity") in {"location_name", "office", "lab_number"}:
                self._add_location(locations, seen_locations, value)

        for location in self.locations_from_text(user_text):
            self._add_location(locations, seen_locations, location)

        locations = self._filter_conflicting_locations(locations)

        return ResolvedEntities(
            values=values,
            locations=locations,
            subject_text=self.normalize_text(" ".join([user_text, *values])),
        )
