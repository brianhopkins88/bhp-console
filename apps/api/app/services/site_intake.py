from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import re

from app.models.assets import TagTaxonomy


BASE_PAGES = [
    ("Home", "Welcome overview and featured photography."),
    ("Services", "Explore photography services and session options."),
    ("Portfolio", "Browse recent sessions and signature work."),
    ("About", "Meet the photographer and learn the story."),
    ("Blog", "Tips, session highlights, and client stories."),
    ("Contact", "Start a session or ask a question."),
]


BASE_TAGS = [
    "family",
    "portrait",
    "party",
    "graduation",
    "commercial",
    "wildlife",
    "travel",
]


def build_site_intake_proposal(
    business_profile: dict,
    changes_requested: str | None = None,
    site_structure: dict | None = None,
) -> dict:
    pages_payload = (
        site_structure.get("pages")
        if isinstance(site_structure, dict)
        else None
    )
    if isinstance(pages_payload, list):
        pages = deepcopy(pages_payload)
    else:
        pages = _build_pages(business_profile)
    tags = _build_tags(business_profile, pages)
    proposal = {
        "business_profile": business_profile,
        "site_structure": {"pages": pages},
        "topic_taxonomy": {"tags": tags},
        "review": {"approved": False, "changes_requested": changes_requested},
        "metadata": {
            "schema_version": "1.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
    if changes_requested:
        _apply_changes_requested(proposal, changes_requested)
    return proposal


def apply_structure_change_request(
    structure: dict,
    change_request: str,
) -> tuple[dict, list[str]]:
    updated = deepcopy(structure) if structure else {}
    summary: list[str] = []
    request_text = (change_request or "").strip()
    if not request_text:
        return updated, ["No change request provided."]

    lowered = request_text.lower()
    if _mentions_service_grouping(lowered):
        moved, created = _group_service_pages_under_services(updated)
        if created:
            summary.append("Added a Services parent page.")
        if moved:
            summary.append(f"Moved {moved} page(s) under Services.")
        else:
            summary.append("No service pages needed regrouping.")
        return updated, summary

    summary.append("No automated rules matched the request.")
    return updated, summary


def seed_tag_taxonomy_from_topics(db, topic_taxonomy: dict) -> None:
    tags = topic_taxonomy.get("tags", []) if isinstance(topic_taxonomy, dict) else []
    now = datetime.now(timezone.utc)
    for item in tags:
        tag_id = str(item.get("id", "")).strip().lower()
        if not tag_id:
            continue
        existing = (
            db.query(TagTaxonomy).filter(TagTaxonomy.tag == tag_id).one_or_none()
        )
        if existing:
            if existing.status != "approved":
                existing.status = "approved"
                existing.approved_at = now
            continue
        db.add(TagTaxonomy(tag=tag_id, status="approved", approved_at=now))


def _build_pages(business_profile: dict) -> list[dict]:
    pages: list[dict] = []
    slug_counts: dict[str, int] = {}

    def add_page(
        title: str,
        description: str,
        parent_id: str | None = None,
        template_id: str | None = None,
        service_type: str | None = None,
    ) -> dict:
        slug = _normalize_page_slug(title)
        slug = _ensure_unique_slug(slug, slug_counts)
        page_id = slug
        page = {
            "id": page_id,
            "title": title,
            "slug": slug,
            "description": description,
            "parent_id": parent_id,
            "order": _next_order(pages, parent_id),
            "status": "draft",
            "template_id": template_id,
            "service_type": service_type,
        }
        pages.append(page)
        return page

    for title, description in BASE_PAGES:
        add_page(title, description, template_id=_default_template_id(title))

    services = _normalize_list(business_profile.get("services"))
    if services:
        services_parent = next(
            (page for page in pages if page["id"] == "services"), None
        )
        parent_id = services_parent["id"] if services_parent else None
        for service in services:
            add_page(
                title=_title_case(service),
                description=f"Details, pricing, and session expectations for {service}.",
                parent_id=parent_id,
                service_type=_normalize_service_type(service),
            )

    return pages


def _mentions_service_grouping(text: str) -> bool:
    if "service" not in text:
        return False
    keywords = ("organize", "group", "nest", "under", "parent")
    return any(keyword in text for keyword in keywords)


def _group_service_pages_under_services(structure: dict) -> tuple[int, bool]:
    pages = structure.get("pages")
    if not isinstance(pages, list):
        structure["pages"] = []
        pages = structure["pages"]

    services_page = _find_services_page(pages)
    created = False
    if services_page is None:
        services_page = _create_services_page(pages)
        created = True

    services_id = services_page["id"]
    moved_pages: list[dict] = []
    for page in pages:
        if page.get("id") == services_id:
            continue
        if page.get("parent_id") == services_id:
            continue
        if _is_service_page(page):
            moved_pages.append(page)

    moved_pages.sort(key=lambda page: str(page.get("title", "")))
    for index, page in enumerate(moved_pages):
        page["parent_id"] = services_id
        page["order"] = index

    return len(moved_pages), created


def _find_services_page(pages: list[dict]) -> dict | None:
    for page in pages:
        slug = str(page.get("slug", "")).lower()
        page_id = str(page.get("id", "")).lower()
        title = str(page.get("title", "")).lower()
        if slug == "services" or page_id == "services" or title == "services":
            return page
    return None


def _create_services_page(pages: list[dict]) -> dict:
    order = _next_order(pages, None)
    page = {
        "id": "services",
        "title": "Services",
        "slug": "services",
        "description": "Explore photography services and session options.",
        "parent_id": None,
        "order": order,
        "status": "draft",
        "template_id": _default_template_id("services"),
        "service_type": None,
    }
    pages.append(page)
    return page


def _is_service_page(page: dict) -> bool:
    service_type = page.get("service_type")
    if service_type:
        return True
    slug = str(page.get("slug", "")).lower()
    title = str(page.get("title", "")).lower()
    if slug in {"home", "about", "portfolio", "blog", "contact", "services"}:
        return False
    keywords = ("service", "session", "package", "pricing")
    return any(keyword in title for keyword in keywords)


def _build_tags(business_profile: dict, pages: list[dict] | None = None) -> list[dict]:
    tags: list[dict] = []
    seen: set[str] = set()

    def add_tag(label: str, parent_id: str | None = None) -> None:
        tag_id = _normalize_tag_id(label)
        if not tag_id or tag_id in seen:
            return
        tags.append({"id": tag_id, "label": label, "parent_id": parent_id})
        seen.add(tag_id)

    for tag in BASE_TAGS:
        add_tag(_title_case(tag))

    for subject in _normalize_list(business_profile.get("subjects")):
        add_tag(_title_case(subject))

    for service in _normalize_list(business_profile.get("services")):
        add_tag(_title_case(service))

    for label in _tags_from_pages(pages or []):
        add_tag(label)

    return tags


def _tags_from_pages(pages: list[dict]) -> list[str]:
    labels: list[str] = []
    for page in pages:
        if not isinstance(page, dict):
            continue
        service_type = page.get("service_type")
        if service_type:
            labels.append(_title_case(str(service_type).replace("-", " ")))
            continue
        if _is_service_page(page):
            title = page.get("title")
            if title:
                labels.append(_title_case(str(title)))
    return labels


def _apply_changes_requested(proposal: dict, changes_requested: str) -> None:
    instructions = [line.strip() for line in changes_requested.splitlines() if line.strip()]
    for line in instructions:
        lowered = line.lower()
        if lowered.startswith("add page:"):
            title = line.split(":", 1)[1].strip()
            if title:
                _add_page_to_proposal(proposal, title)
            continue
        if lowered.startswith("remove page:"):
            title = line.split(":", 1)[1].strip()
            if title:
                _remove_page_from_proposal(proposal, title)
            continue
        if lowered.startswith("add tag:"):
            label = line.split(":", 1)[1].strip()
            if label:
                _add_tag_to_proposal(proposal, label)
            continue
        if lowered.startswith("remove tag:"):
            label = line.split(":", 1)[1].strip()
            if label:
                _remove_tag_from_proposal(proposal, label)
            continue

        match_remove = re.match(r"remove\s+page\s+(.+)$", lowered)
        if match_remove:
            _remove_page_from_proposal(proposal, match_remove.group(1))
            continue

        match_add = re.match(r"add\s+page\s+(.+)$", lowered)
        if match_add:
            _add_page_to_proposal(proposal, match_add.group(1))
            continue

        match_tag_add = re.match(r"add\s+tag\s+(.+)$", lowered)
        if match_tag_add:
            _add_tag_to_proposal(proposal, match_tag_add.group(1))
            continue


def _add_page_to_proposal(proposal: dict, title: str) -> None:
    pages = proposal.get("site_structure", {}).get("pages", [])
    if not isinstance(pages, list):
        return
    slug_counts: dict[str, int] = {page["slug"]: 1 for page in pages if "slug" in page}
    slug = _ensure_unique_slug(_normalize_page_slug(title), slug_counts)
    pages.append(
        {
            "id": slug,
            "title": _title_case(title),
            "slug": slug,
            "description": f"Overview of {title}.",
            "parent_id": None,
            "order": _next_order(pages, None),
            "status": "draft",
            "template_id": _default_template_id(title),
            "service_type": None,
        }
    )


def _remove_page_from_proposal(proposal: dict, title: str) -> None:
    pages = proposal.get("site_structure", {}).get("pages", [])
    if not isinstance(pages, list):
        return
    slug = _normalize_page_slug(title)
    proposal["site_structure"]["pages"] = [
        page for page in pages if page.get("slug") != slug and page.get("id") != slug
    ]


def _add_tag_to_proposal(proposal: dict, label: str) -> None:
    tags = proposal.get("topic_taxonomy", {}).get("tags", [])
    if not isinstance(tags, list):
        return
    tag_id = _normalize_tag_id(label)
    if not tag_id or any(tag.get("id") == tag_id for tag in tags):
        return
    tags.append({"id": tag_id, "label": _title_case(label), "parent_id": None})


def _remove_tag_from_proposal(proposal: dict, label: str) -> None:
    tags = proposal.get("topic_taxonomy", {}).get("tags", [])
    if not isinstance(tags, list):
        return
    tag_id = _normalize_tag_id(label)
    proposal["topic_taxonomy"]["tags"] = [
        tag for tag in tags if tag.get("id") != tag_id and tag.get("label", "").lower() != label.lower()
    ]


def _normalize_list(values: object) -> list[str]:
    if not values:
        return []
    if isinstance(values, list):
        return [str(value).strip() for value in values if str(value).strip()]
    return [str(values).strip()]


def _normalize_page_slug(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in {" ", "-"} else " " for ch in value.lower())
    slug = "-".join(cleaned.split()).strip("-")
    return slug or "page"


def _normalize_tag_id(value: str) -> str:
    cleaned = "".join(
        ch if ch.isalnum() or ch in {" ", "-", "_", "."} else " " for ch in value.lower()
    )
    slug = "-".join(cleaned.split()).strip("-")
    return slug or "tag"


def _ensure_unique_slug(slug: str, slug_counts: dict[str, int]) -> str:
    if slug not in slug_counts:
        slug_counts[slug] = 1
        return slug
    slug_counts[slug] += 1
    return f"{slug}-{slug_counts[slug]}"


def _next_order(pages: list[dict], parent_id: str | None) -> int:
    siblings = [page for page in pages if page.get("parent_id") == parent_id]
    if not siblings:
        return 0
    return max(int(page.get("order", 0)) for page in siblings) + 1


def _default_template_id(title: str) -> str | None:
    slug = _normalize_page_slug(title)
    if slug == "home":
        return "tpl-home-hero"
    if slug == "services":
        return "tpl-services-grid"
    if slug == "portfolio":
        return "tpl-portfolio-grid"
    if slug == "about":
        return "tpl-about"
    if slug == "blog":
        return "tpl-blog"
    if slug == "contact":
        return "tpl-contact"
    return None


def _normalize_service_type(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "service"


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.replace("_", " ").split())
