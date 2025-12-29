"use client";

import { useEffect, useMemo, useState } from "react";

type AssetTag = {
  tag: string;
  source: string;
  confidence?: number | null;
};

type AssetRole = {
  role: string;
  scope?: string | null;
  is_published?: boolean;
};

type AssetVariant = {
  ratio: string;
  width: number;
  height: number;
  format: string;
  path: string;
  version: number;
};

type TagTaxonomy = {
  tag: string;
  status: string;
  created_at: string;
  approved_at?: string | null;
};

type TopicTag = {
  id: string;
  label: string;
};

type AutoTagJob = {
  asset_id: string;
  status: string;
  error_message?: string | null;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
};

type Asset = {
  id: string;
  original_filename: string;
  original_path: string;
  width: number;
  height: number;
  focal_x: number;
  focal_y: number;
  rating: number;
  starred: boolean;
  tags: AssetTag[];
  roles: AssetRole[];
  variants: AssetVariant[];
  created_at: string;
};

type Lane = "all" | "inbox" | "review" | "publish";

type ViewMode = "grid" | "detail";

type Density = "compact" | "comfortable";

type GroupBy = "none" | "status" | "role";

type Orientation = "landscape" | "portrait" | "square";

const ROLE_OPTIONS = [
  {
    key: "logo",
    label: "Logo",
    description: "Use as a logo image.",
  },
  {
    key: "hero_main",
    label: "Hero main",
    description: "Main image for the site.",
  },
  {
    key: "gallery",
    label: "Gallery",
    description: "Add this image to a gallery as example work.",
  },
  {
    key: "showcase",
    label: "Showcase",
    description: "Showcase this image on a service or other page.",
  },
  {
    key: "social",
    label: "Social",
    description: "Use this image for blogs and other social media posts.",
  },
] as const;

type RoleKey = (typeof ROLE_OPTIONS)[number]["key"];

const PUBLISHABLE_ROLES = new Set<RoleKey>(["logo", "showcase", "hero_main"]);

export default function AdminPhotosPage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

  const ratioLabel = (width: number, height: number) => {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const factor = gcd(width, height) || 1;
    return `${Math.round(width / factor)}:${Math.round(height / factor)}`;
  };

  const getOrientation = (width: number, height: number): Orientation => {
    if (width === height) return "square";
    return width > height ? "landscape" : "portrait";
  };

  const getLane = (asset: Asset): Lane => {
    if (!asset.tags.length && !asset.roles.length) return "inbox";
    if (asset.tags.length && !asset.roles.length) return "review";
    if (asset.roles.length) return "publish";
    return "all";
  };

  const roleLabel = (roleKey: string) =>
    ROLE_OPTIONS.find((option) => option.key === roleKey)?.label ?? roleKey;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<{ id: string; label: string }>>(
    []
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [pendingTags, setPendingTags] = useState<TagTaxonomy[]>([]);
  const [topicTags, setTopicTags] = useState<TopicTag[]>([]);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [roleSelections, setRoleSelections] = useState<Record<string, string[]>>(
    {}
  );
  const [rolePublished, setRolePublished] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({});
  const [starInputs, setStarInputs] = useState<Record<string, boolean>>({});
  const [focalInputs, setFocalInputs] = useState<
    Record<string, { x: string; y: string }>
  >({});
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const [lane, setLane] = useState<Lane>("inbox");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [density, setDensity] = useState<Density>("compact");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedOrientations, setSelectedOrientations] = useState<
    Set<Orientation>
  >(new Set());
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const [sortMode, setSortMode] = useState("newest");

  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [autoTagJobs, setAutoTagJobs] = useState<Record<string, AutoTagJob>>({});
  const [bulkTagsInput, setBulkTagsInput] = useState("");
  const [bulkRoleSelections, setBulkRoleSelections] = useState<Set<RoleKey>>(
    new Set()
  );
  const [bulkRating, setBulkRating] = useState<number | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);

  const [openSections, setOpenSections] = useState({
    roles: true,
    tags: true,
    orientation: true,
    rating: true,
  });

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const selectedAssetIds = useMemo(
    () => Array.from(selectedAssets),
    [selectedAssets]
  );

  const selectedAssetId = useMemo(() => {
    if (selectedAssets.size !== 1) return null;
    return selectedAssetIds[0] ?? null;
  }, [selectedAssets, selectedAssetIds]);

  const buildAssetsQuery = () => {
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }
    selectedTags.forEach((tag) => params.append("tags", tag));
    selectedRoles.forEach((role) => params.append("roles", role));
    selectedOrientations.forEach((orientation) =>
      params.append("orientations", orientation)
    );
    if (ratingFilter !== null) {
      params.set("min_rating", ratingFilter.toString());
    }
    if (starredOnly) {
      params.set("starred", "true");
    }
    if (sortMode) {
      params.set("sort", sortMode);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const loadAssets = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/api/v1/assets${buildAssetsQuery()}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as Asset[];
      setAssets(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTags = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/assets/taxonomy?status=pending`
      );
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as TagTaxonomy[];
      setPendingTags(data);
    } catch {
      // Ignore taxonomy load errors to keep the page usable.
    }
  };

  const loadTopicTags = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/site/taxonomy`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as {
        taxonomy_data?: { tags?: TopicTag[] };
      };
      const tags = data?.taxonomy_data?.tags ?? [];
      setTopicTags(tags);
    } catch {
      // Ignore topic taxonomy load errors.
    }
  };

  const loadAutoTagJobs = async (assetIds: string[]) => {
    if (!assetIds.length) return;
    const params = new URLSearchParams();
    assetIds.forEach((assetId) => params.append("asset_ids", assetId));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/assets/auto-tag/status?${params.toString()}`
      );
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as AutoTagJob[];
      setAutoTagJobs((prev) => {
        const next = { ...prev };
        data.forEach((job) => {
          next[job.asset_id] = job;
        });
        return next;
      });
    } catch {
      // Ignore auto-tag status failures to avoid blocking the UI.
    }
  };

  useEffect(() => {
    void loadAssets();
  }, [
    apiBaseUrl,
    searchTerm,
    selectedTags,
    selectedRoles,
    selectedOrientations,
    ratingFilter,
    starredOnly,
    sortMode,
  ]);

  useEffect(() => {
    void loadPendingTags();
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadTopicTags();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedAssetIds.length) return;
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      await loadAutoTagJobs(selectedAssetIds);
    };

    void refresh();
    const interval = window.setInterval(refresh, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiBaseUrl, selectedAssetIds]);

  useEffect(() => {
    const nextRatings: Record<string, number> = {};
    const nextStars: Record<string, boolean> = {};
    const nextFocal: Record<string, { x: string; y: string }> = {};
    const nextRoles: Record<string, string[]> = {};
    const nextPublished: Record<string, Record<string, boolean>> = {};

    assets.forEach((asset) => {
      nextRatings[asset.id] = asset.rating ?? 0;
      nextStars[asset.id] = asset.starred ?? false;
      nextFocal[asset.id] = {
        x: asset.focal_x?.toFixed(2) ?? "0.50",
        y: asset.focal_y?.toFixed(2) ?? "0.50",
      };
      nextRoles[asset.id] = asset.roles.map((role) => role.role);
      nextPublished[asset.id] = asset.roles.reduce<Record<string, boolean>>(
        (acc, role) => {
          acc[role.role] = Boolean(role.is_published);
          return acc;
        },
        {}
      );
    });

    setRatingInputs(nextRatings);
    setStarInputs(nextStars);
    setFocalInputs(nextFocal);
    setRoleSelections(nextRoles);
    setRolePublished(nextPublished);
  }, [assets]);

  const uploadLabel = useMemo(() => {
    if (uploading) return "Uploading...";
    return "Upload image";
  }, [uploading]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    assets.forEach((asset) => {
      asset.tags.forEach((tag) => tags.add(tag.tag));
    });
    return Array.from(tags).sort();
  }, [assets]);

  const roleFilterOptions = useMemo(() => {
    const optionMap = new Map<string, { key: string; label: string; description: string }>();
    ROLE_OPTIONS.forEach((option) => optionMap.set(option.key, option));
    assets.forEach((asset) => {
      asset.roles.forEach((role) => {
        if (!optionMap.has(role.role)) {
          optionMap.set(role.role, {
            key: role.role,
            label: role.role,
            description: "Custom role.",
          });
        }
      });
    });
    return Array.from(optionMap.values());
  }, [assets]);

  const laneCounts = useMemo(() => {
    const counts = { all: assets.length, inbox: 0, review: 0, publish: 0 };
    assets.forEach((asset) => {
      counts[getLane(asset)] += 1;
    });
    return counts;
  }, [assets]);

  const hasHeroMain = useMemo(
    () => assets.some((asset) => asset.roles.some((role) => role.role === "hero_main")),
    [assets]
  );

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    if (lane !== "all") {
      result = result.filter((asset) => getLane(asset) === lane);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((asset) => {
        const inName = asset.original_filename.toLowerCase().includes(term);
        const inTags = asset.tags.some((tag) => tag.tag.toLowerCase().includes(term));
        return inName || inTags;
      });
    }

    if (selectedTags.size) {
      result = result.filter((asset) =>
        asset.tags.some((tag) => selectedTags.has(tag.tag))
      );
    }

    if (selectedRoles.size) {
      result = result.filter((asset) =>
        asset.roles.some((role) => selectedRoles.has(role.role))
      );
    }

    if (selectedOrientations.size) {
      result = result.filter((asset) =>
        selectedOrientations.has(getOrientation(asset.width, asset.height))
      );
    }

    if (ratingFilter !== null) {
      result = result.filter((asset) => (asset.rating ?? 0) >= ratingFilter);
    }

    if (starredOnly) {
      result = result.filter((asset) => asset.starred);
    }

    if (sortMode === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (sortMode === "oldest") {
      result.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    if (sortMode === "rating") {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [
    assets,
    lane,
    searchTerm,
    selectedTags,
    selectedRoles,
    selectedOrientations,
    ratingFilter,
    starredOnly,
    sortMode,
  ]);

  const groupedAssets = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All", assets: filteredAssets }];
    }

    if (groupBy === "status") {
      const groups: Record<string, Asset[]> = {
        inbox: [],
        review: [],
        publish: [],
      };
      filteredAssets.forEach((asset) => {
        groups[getLane(asset)].push(asset);
      });
      return [
        { key: "inbox", label: "Inbox", assets: groups.inbox },
        { key: "review", label: "Review", assets: groups.review },
        { key: "publish", label: "Publish", assets: groups.publish },
      ];
    }

    const groups: Record<string, Asset[]> = {};
    filteredAssets.forEach((asset) => {
      const primaryRole = asset.roles[0]?.role ?? "Unassigned";
      if (!groups[primaryRole]) {
        groups[primaryRole] = [];
      }
      groups[primaryRole].push(asset);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, label: key, assets: items }));
  }, [filteredAssets, groupBy]);

  const autoTagSummary = useMemo(() => {
    const counts = {
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      idle: 0,
    };
    selectedAssetIds.forEach((assetId) => {
      const job = autoTagJobs[assetId];
      if (!job) {
        counts.idle += 1;
        return;
      }
      const status = job.status;
      if (status === "queued") counts.queued += 1;
      else if (status === "running") counts.running += 1;
      else if (status === "completed") counts.completed += 1;
      else if (status === "failed") counts.failed += 1;
      else counts.idle += 1;
    });
    return counts;
  }, [autoTagJobs, selectedAssetIds]);

  const failedAutoTagJob = useMemo(() => {
    return selectedAssetIds
      .map((assetId) => autoTagJobs[assetId])
      .find((job) => job?.status === "failed");
  }, [autoTagJobs, selectedAssetIds]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelection = (assetId: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedAssets(new Set(filteredAssets.map((asset) => asset.id)));
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  const uploadSingle = async (
    file: File,
    uploadId: string,
    wantsDerivatives: boolean,
    tags: string
  ) => {
    return new Promise<void>((resolve, reject) => {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("generate_derivatives", wantsDerivatives ? "true" : "false");
      if (tags) {
        payload.set("tags", tags);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiBaseUrl}/api/v1/assets/upload`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const nextValue = Math.round((event.loaded / event.total) * 100);
        setUploadProgress((prev) => ({ ...prev, [uploadId]: nextValue }));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(payload);
    });
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const wantsDerivatives = formData.get("generate_derivatives") ? "true" : "false";
    const tags = (formData.get("tags") as string) || "";
    const files = formData.getAll("file") as File[];

    if (!files.length) return;

    setUploading(true);
    setError(null);
    try {
      const queue = files.map((file, index) => ({
        id: `${file.name || "file"}-${index}`,
        label: file.name || `File ${index + 1}`,
      }));
      setUploadQueue(queue);
      setUploadProgress(
        Object.fromEntries(queue.map((item) => [item.id, 0]))
      );

      for (const [index, file] of files.entries()) {
        if (!file || !file.name) continue;
        const uploadId = queue[index]?.id ?? `${file.name}-${index}`;
        await uploadSingle(file, uploadId, wantsDerivatives === "true", tags);
      }
      form.reset();
      await loadAssets();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      setUploadQueue([]);
      setUploadProgress({});
    }
  };

  const handleAddTags = async (assetId: string) => {
    setActionError(null);
    const tags = (tagInputs[assetId] ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!tags.length) return;

    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tags.map((tag) => ({ tag, source: "manual" }))),
    });
    if (!response.ok) {
      setActionError(`Failed to save tags (HTTP ${response.status}).`);
      return;
    }
    setTagInputs((prev) => ({ ...prev, [assetId]: "" }));
    await loadAssets();
  };

  const handleToggleRole = async (assetId: string, role: string) => {
    setActionError(null);
    const current = new Set(roleSelections[assetId] ?? []);
    if (current.has(role)) {
      current.delete(role);
    } else {
      current.add(role);
    }
    const nextRoles = Array.from(current);
    setRoleSelections((prev) => ({ ...prev, [assetId]: nextRoles }));
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        nextRoles.map((roleValue) => ({
          role: roleValue,
          is_published:
            roleValue === "hero_main"
              ? true
              : rolePublished[assetId]?.[roleValue] ?? false,
        }))
      ),
    });
    if (!response.ok) {
      setActionError(`Failed to save roles (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleSetRating = async (assetId: string, rating: number) => {
    setActionError(null);
    setRatingInputs((prev) => ({ ...prev, [assetId]: rating }));
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/rating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        starred: starInputs[assetId] ?? false,
      }),
    });
    if (!response.ok) {
      setActionError(`Failed to save rating (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleToggleStar = async (assetId: string) => {
    setActionError(null);
    const nextStar = !(starInputs[assetId] ?? false);
    setStarInputs((prev) => ({ ...prev, [assetId]: nextStar }));
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/rating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: ratingInputs[assetId] ?? 0,
        starred: nextStar,
      }),
    });
    if (!response.ok) {
      setActionError(`Failed to save rating (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleSaveFocal = async (assetId: string) => {
    setActionError(null);
    const focal = focalInputs[assetId];
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/focal-point`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x: Number(focal?.x ?? 0.5),
        y: Number(focal?.y ?? 0.5),
      }),
    });
    if (!response.ok) {
      setActionError(`Failed to save focal point (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleDeleteAsset = async (assetId: string) => {
    setActionError(null);
    const confirmed = window.confirm(
      "Delete this asset and all derived images? This cannot be undone."
    );
    if (!confirmed) return;

    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setActionError(`Failed to delete asset (HTTP ${response.status}).`);
      return;
    }
    if (previewAsset?.id === assetId) {
      setPreviewAsset(null);
    }
    await loadAssets();
  };

  const handleTogglePublished = async (assetId: string, role: string) => {
    setActionError(null);
    const current = rolePublished[assetId]?.[role] ?? false;
    const next = !current;
    const response = await fetch(
      `${apiBaseUrl}/api/v1/assets/${assetId}/roles/${role}/publish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: next }),
      }
    );
    if (!response.ok) {
      setActionError(`Failed to update publish status (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleSetHeroMain = async (assetId: string) => {
    setActionError(null);
    const currentRoles = roleSelections[assetId] ?? [];
    if (currentRoles.includes("hero_main")) {
      return;
    }
    const nextRoles = Array.from(new Set([...currentRoles, "hero_main"]));
    setRoleSelections((prev) => ({ ...prev, [assetId]: nextRoles }));
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        nextRoles.map((roleValue) => ({
          role: roleValue,
          is_published:
            roleValue === "hero_main"
              ? true
              : rolePublished[assetId]?.[roleValue] ?? false,
        }))
      ),
    });
    if (!response.ok) {
      setActionError(`Failed to set hero main (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleRemoveTag = async (assetId: string, tag: AssetTag) => {
    setActionError(null);
    const params = new URLSearchParams({ tag: tag.tag });
    if (tag.source) {
      params.set("source", tag.source);
    }
    const response = await fetch(
      `${apiBaseUrl}/api/v1/assets/${assetId}/tags?${params.toString()}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setActionError(`Failed to remove tag (HTTP ${response.status}).`);
      return;
    }
    await loadAssets();
  };

  const handleAddTopicTag = (assetId: string, tagId: string) => {
    setTagInputs((prev) => {
      const existing = prev[assetId] ?? "";
      const tags = existing
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!tags.includes(tagId)) {
        tags.push(tagId);
      }
      return { ...prev, [assetId]: tags.join(", ") };
    });
  };

  const handleBulkTags = async () => {
    if (!selectedAssets.size) return;
    const tags = bulkTagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!tags.length) return;

    setBulkWorking(true);
    setActionError(null);
    try {
      for (const assetId of selectedAssets) {
        const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tags.map((tag) => ({ tag, source: "manual" }))),
        });
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      setBulkTagsInput("");
      await loadAssets();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkAutoTag = async () => {
    if (!selectedAssets.size) return;
    setBulkWorking(true);
    setActionError(null);
    setActionMessage(null);
    let didQueue = false;
    try {
      for (const assetId of selectedAssets) {
        const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/auto-tag`, {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      didQueue = true;
      const now = new Date().toISOString();
      setAutoTagJobs((prev) => {
        const next = { ...prev };
        selectedAssetIds.forEach((assetId) => {
          next[assetId] = {
            asset_id: assetId,
            status: "queued",
            updated_at: now,
          };
        });
        return next;
      });
      setActionMessage(
        `Auto-tagging queued for ${selectedAssets.size} asset${
          selectedAssets.size === 1 ? "" : "s"
        }. Results may take a minute.`
      );
      if (lane === "inbox") {
        setTimeout(() => setLane("review"), 2500);
      }
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
      if (didQueue) {
        setTimeout(() => {
          void loadAssets();
          void loadPendingTags();
          void loadAutoTagJobs(selectedAssetIds);
        }, 2000);
        setTimeout(() => {
          void loadAssets();
          void loadPendingTags();
          void loadAutoTagJobs(selectedAssetIds);
        }, 8000);
      }
    }
  };

  const handleApproveTag = async (tag: string) => {
    setActionError(null);
    const response = await fetch(`${apiBaseUrl}/api/v1/assets/taxonomy/${tag}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (!response.ok) {
      setActionError(`Failed to approve ${tag}.`);
      return;
    }
    await loadPendingTags();
  };

  const handleBulkRoles = async () => {
    if (!selectedAssets.size) return;
    const roles = Array.from(bulkRoleSelections);
    if (!roles.length) return;

    setBulkWorking(true);
    setActionError(null);
    try {
      for (const assetId of selectedAssets) {
        const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roles.map((role) => ({ role }))),
        });
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      setBulkRoleSelections(new Set());
      await loadAssets();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkPublish = async (role: RoleKey, isPublished: boolean) => {
    if (!selectedAssets.size) return;
    setBulkWorking(true);
    setActionError(null);
    try {
      for (const assetId of selectedAssets) {
        const currentRoles = roleSelections[assetId] ?? [];
        if (!currentRoles.includes(role)) {
          continue;
        }
        const currentPublished = rolePublished[assetId]?.[role] ?? false;
        if (currentPublished === isPublished) {
          continue;
        }
        const response = await fetch(
          `${apiBaseUrl}/api/v1/assets/${assetId}/roles/${role}/publish`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_published: isPublished }),
          }
        );
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      await loadAssets();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkRating = async (rating: number) => {
    if (!selectedAssets.size) return;
    setBulkWorking(true);
    setActionError(null);
    try {
      for (const assetId of selectedAssets) {
        const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}/rating`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            starred: false,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      setBulkRating(rating);
      await loadAssets();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedAssets.size) return;
    const confirmed = window.confirm(
      `Delete ${selectedAssets.size} assets and all derived images?`
    );
    if (!confirmed) return;

    setBulkWorking(true);
    setActionError(null);
    try {
      for (const assetId of selectedAssets) {
        const response = await fetch(`${apiBaseUrl}/api/v1/assets/${assetId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`Failed on ${assetId}`);
        }
      }
      clearSelection();
      await loadAssets();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBulkWorking(false);
    }
  };

  const toggleFilterSet = <T,>(
    setter: React.Dispatch<React.SetStateAction<Set<T>>>,
    value: T
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const renderRatingStars = (rating: number) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`text-xs ${rating >= value ? "text-amber-500" : "text-zinc-300"}`}
        >
          ★
        </span>
      ))}
    </div>
  );

  const renderGridCard = (asset: Asset) => {
    const isSelected = selectedAssets.has(asset.id);
    const rating = ratingInputs[asset.id] ?? 0;
    return (
      <div
        key={asset.id}
        className={`group rounded-2xl border bg-white p-3 shadow-sm transition ${
          isSelected ? "border-zinc-900" : "border-zinc-200"
        }`}
      >
        <div className="flex items-start justify-between">
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(asset.id)}
            />
            Select
          </label>
          <button
            type="button"
            onClick={() => setPreviewAsset(asset)}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Preview
          </button>
        </div>
        <button
          type="button"
          className={`mt-3 w-full overflow-hidden rounded-xl border bg-zinc-100 ${
            density === "compact" ? "h-32" : "h-40"
          }`}
          onClick={() => setPreviewAsset(asset)}
        >
          <img
            src={`${apiBaseUrl}/api/v1/assets/${asset.id}/thumbnail`}
            alt={asset.original_filename}
            className="h-full w-full object-cover"
          />
        </button>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {asset.original_filename}
            </p>
            <span className="text-[11px] text-zinc-500">
              {ratioLabel(asset.width, asset.height)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {renderRatingStars(rating)}
            <span className="text-[11px] text-zinc-500">{rating}/5</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {asset.roles.slice(0, 2).map((role) => (
              <span
                key={`${asset.id}-${role.role}`}
                className="group/role inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800"
                title={role.is_published ? "Published on site" : "Not published"}
              >
                {roleLabel(role.role)}
                {role.is_published ? (
                  <span className="text-[8px] text-amber-500">●</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleToggleRole(asset.id, role.role)}
                  className="text-[10px] text-amber-500 opacity-0 transition group-hover/role:opacity-100"
                  aria-label={`Remove role ${role.role}`}
                  title="Remove role"
                >
                  ×
                </button>
              </span>
            ))}
            {asset.tags.slice(0, 3).map((tag) => (
              <span
                key={`${asset.id}-${tag.tag}`}
                className="group/tag inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
              >
                {tag.tag}
                <button
                  type="button"
                  onClick={() => void handleRemoveTag(asset.id, tag)}
                  className="text-[10px] text-zinc-400 opacity-0 transition group-hover/tag:opacity-100"
                  aria-label={`Remove tag ${tag.tag}`}
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Photo Library</h2>
        <p className="max-w-2xl text-sm text-zinc-600">
          Upload images, review tags, and assign roles like hero main, showcase,
          or gallery.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              name="file"
              type="file"
              accept="image/*"
              multiple
              className="flex-1 text-sm"
              required
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {uploadLabel}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="generate_derivatives"
                defaultChecked
              />
              Generate derivatives
            </label>
            <label className="flex items-center gap-2">
              <span>Tags</span>
              <input
                name="tags"
                placeholder="logo, brand, hero"
                className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
              />
            </label>
            <span>Tip: use the tag &quot;logo&quot; for special handling.</span>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {uploading && uploadQueue.length ? (
          <div className="mt-3 space-y-2">
            {uploadQueue.map((item) => {
              const progress = uploadProgress[item.id] ?? 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="truncate">{item.label}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-3">
        {([
          { key: "all", label: "All" },
          { key: "inbox", label: "Inbox" },
          { key: "review", label: "Review" },
          { key: "publish", label: "Publish" },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLane(item.key)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              lane === item.key
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {item.label} ({laneCounts[item.key] ?? 0})
          </button>
        ))}
      </section>
      <p className="text-xs text-zinc-500">
        Inbox: no tags or roles. Review: tags added but no roles. Publish: one
        or more roles assigned.
      </p>
      {!hasHeroMain ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Hero main is required. Set one image as hero main to publish the site.
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Search
            </label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search filename or tag"
              className="mt-2 w-full rounded-full border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, roles: !prev.roles }))
              }
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Roles
              <span>{openSections.roles ? "−" : "+"}</span>
            </button>
            {openSections.roles ? (
              <div className="mt-3 space-y-2">
                {roleFilterOptions.length ? (
                  roleFilterOptions.map((role) => (
                    <label
                      key={role.key}
                      className="flex items-center gap-2 text-xs text-zinc-600"
                      title={role.description}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.has(role.key)}
                        onChange={() =>
                          toggleFilterSet(setSelectedRoles, role.key)
                        }
                      />
                      {role.label}
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">No roles yet</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Tag approvals
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                {pendingTags.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {pendingTags.length ? (
                pendingTags.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between gap-2 text-xs text-zinc-600"
                  >
                    <span className="truncate">{item.tag}</span>
                    <button
                      type="button"
                      onClick={() => void handleApproveTag(item.tag)}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                    >
                      Approve
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-400">No pending tags</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Topic tags
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                {topicTags.length}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topicTags.length ? (
                topicTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-500"
                  >
                    {tag.label}
                  </span>
                ))
              ) : (
                <p className="text-xs text-zinc-400">No topic tags yet</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, tags: !prev.tags }))
              }
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Tags
              <span>{openSections.tags ? "−" : "+"}</span>
            </button>
            {openSections.tags ? (
              <div className="mt-3 space-y-2">
                {allTags.length ? (
                  allTags.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 text-xs text-zinc-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag)}
                        onChange={() => toggleFilterSet(setSelectedTags, tag)}
                      />
                      {tag}
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">No tags yet</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  orientation: !prev.orientation,
                }))
              }
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Orientation
              <span>{openSections.orientation ? "−" : "+"}</span>
            </button>
            {openSections.orientation ? (
              <div className="mt-3 space-y-2">
                {(["landscape", "portrait", "square"] as Orientation[]).map(
                  (value) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-xs text-zinc-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrientations.has(value)}
                        onChange={() =>
                          toggleFilterSet(setSelectedOrientations, value)
                        }
                      />
                      {value}
                    </label>
                  )
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, rating: !prev.rating }))
              }
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Rating
              <span>{openSections.rating ? "−" : "+"}</span>
            </button>
            {openSections.rating ? (
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  Minimum rating
                  <select
                    value={ratingFilter ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRatingFilter(value ? Number(value) : null);
                    }}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs"
                  >
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}+
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={starredOnly}
                    onChange={(event) => setStarredOnly(event.target.checked)}
                  />
                  Starred only
                </label>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedRoles(new Set());
              setSelectedTags(new Set());
              setSelectedOrientations(new Set());
              setRatingFilter(null);
              setStarredOnly(false);
              setSearchTerm("");
            }}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            Reset filters
          </button>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-zinc-500">
                View
                <select
                  value={viewMode}
                  onChange={(event) =>
                    setViewMode(event.target.value as ViewMode)
                  }
                  className="ml-2 rounded-full border border-zinc-200 px-3 py-1 text-xs"
                >
                  <option value="grid">Grid</option>
                  <option value="detail">Detail</option>
                </select>
              </label>
              <label className="text-xs text-zinc-500">
                Density
                <select
                  value={density}
                  onChange={(event) =>
                    setDensity(event.target.value as Density)
                  }
                  className="ml-2 rounded-full border border-zinc-200 px-3 py-1 text-xs"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                </select>
              </label>
              <label className="text-xs text-zinc-500">
                Group
                <select
                  value={groupBy}
                  onChange={(event) =>
                    setGroupBy(event.target.value as GroupBy)
                  }
                  className="ml-2 rounded-full border border-zinc-200 px-3 py-1 text-xs"
                >
                  <option value="status">Status</option>
                  <option value="role">Role</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label className="text-xs text-zinc-500">
                Sort
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                  className="ml-2 rounded-full border border-zinc-200 px-3 py-1 text-xs"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="rating">Rating</option>
                </select>
              </label>
            </div>
            <div className="text-xs text-zinc-500">
              {loading ? "Loading..." : `${filteredAssets.length} items`}
            </div>
          </div>

          {selectedAssets.size ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {selectedAssets.size} selected
                  </p>
                  <p className="text-xs text-zinc-500">
                    Bulk actions apply to the selected assets.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
                  >
                    Unselect all
                  </button>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectedAssetId
                        ? void handleSetHeroMain(selectedAssetId)
                        : null
                    }
                    disabled={!selectedAssetId}
                    title={
                      selectedAssetId
                        ? "Set selected image as hero main"
                        : "Select one image to set hero main"
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      selectedAssetId
                        ? "border-amber-200 text-amber-700 hover:border-amber-300"
                        : "cursor-not-allowed border-zinc-100 text-zinc-300"
                    }`}
                  >
                    Set hero main
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkWorking}
                    className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Tags
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      value={bulkTagsInput}
                      onChange={(event) => setBulkTagsInput(event.target.value)}
                      placeholder="Add tags"
                      className="w-full rounded-full border border-zinc-200 px-3 py-2 text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleBulkTags}
                        disabled={bulkWorking || !bulkTagsInput.trim()}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          bulkWorking || !bulkTagsInput.trim()
                            ? "cursor-not-allowed border-zinc-100 text-zinc-300"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkAutoTag}
                        disabled={bulkWorking}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
                      >
                        Auto-tag
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Roles
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => {
                      const isActive = bulkRoleSelections.has(role.key);
                      const isDisabled = role.key === "hero_main";
                      return (
                        <button
                          key={`bulk-${role.key}`}
                          type="button"
                          onClick={() =>
                            toggleFilterSet(setBulkRoleSelections, role.key)
                          }
                          disabled={isDisabled}
                          title={role.description}
                          className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
                            isDisabled
                              ? "cursor-not-allowed border-zinc-100 text-zinc-300"
                              : isActive
                                ? "border-amber-400 bg-amber-100 text-amber-700"
                                : "border-zinc-200 text-zinc-600"
                          }`}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>Hero main is set via the top action.</span>
                    <button
                      type="button"
                      onClick={handleBulkRoles}
                      disabled={bulkWorking}
                      className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
                    >
                      Apply roles
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Publish
                  </p>
                  <div className="mt-2 space-y-2">
                    {ROLE_OPTIONS.filter(
                      (role) =>
                        PUBLISHABLE_ROLES.has(role.key) && role.key !== "hero_main"
                    ).map((role) => (
                      <div
                        key={`bulk-publish-${role.key}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600"
                      >
                        <span>{role.label}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBulkPublish(role.key, true)}
                            disabled={bulkWorking}
                            className="rounded-full border border-emerald-200 px-3 py-2 font-semibold text-emerald-700"
                          >
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkPublish(role.key, false)}
                            disabled={bulkWorking}
                            className="rounded-full border border-zinc-200 px-3 py-2 font-semibold text-zinc-500"
                          >
                            Unpublish
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Only applies to assets that already have the role.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Rating
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleBulkRating(value)}
                        disabled={bulkWorking}
                        className={`h-8 w-8 rounded-full border text-xs ${
                          bulkRating === value
                            ? "border-amber-400 bg-amber-100 text-amber-700"
                            : "border-zinc-200 text-zinc-500"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <span>
                  Auto-tag status: queued {autoTagSummary.queued}, running{" "}
                  {autoTagSummary.running}, completed {autoTagSummary.completed}, failed{" "}
                  {autoTagSummary.failed}
                </span>
                <button
                  type="button"
                  onClick={() => void loadAutoTagJobs(selectedAssetIds)}
                  disabled={bulkWorking}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600"
                >
                  Refresh status
                </button>
              </div>
              {failedAutoTagJob?.error_message ? (
                <p className="mt-2 text-xs text-red-600">
                  Auto-tag failed: {failedAutoTagJob.error_message}
                </p>
              ) : null}
              {actionError ? (
                <p className="mt-2 text-sm text-red-600">{actionError}</p>
              ) : null}
              {actionMessage ? (
                <p className="mt-2 text-sm text-emerald-600">{actionMessage}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-6">
            {groupedAssets.map((group) => {
              const collapsed = collapsedGroups[group.key];
              return (
                <div key={group.key} className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full items-center justify-between text-sm font-semibold text-zinc-800"
                  >
                    {group.label} ({group.assets.length})
                    <span className="text-xs text-zinc-500">
                      {collapsed ? "Show" : "Hide"}
                    </span>
                  </button>
                  {collapsed ? null : group.assets.length ? (
                    viewMode === "grid" ? (
                      <div
                        className={`grid gap-4 ${
                          density === "compact"
                            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                        }`}
                      >
                        {group.assets.map(renderGridCard)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {group.assets.map((asset) => {
                          const rating = ratingInputs[asset.id] ?? 0;
                          const hasHeroMain = asset.roles.some(
                            (role) => role.role === "hero_main"
                          );
                          const hasPublishedLogo = asset.roles.some(
                            (role) => role.role === "logo" && role.is_published
                          );
                          const hasPublishedShowcase = asset.roles.some(
                            (role) => role.role === "showcase" && role.is_published
                          );
                          const canDelete =
                            !hasHeroMain && !hasPublishedLogo && !hasPublishedShowcase;
                          return (
                            <div
                              key={asset.id}
                              className="rounded-2xl border border-zinc-200 bg-white p-6"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-start gap-4">
                                  <button
                                    type="button"
                                    className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                                    onClick={() => setPreviewAsset(asset)}
                                    aria-label={`Preview ${asset.original_filename}`}
                                  >
                                    <img
                                      src={`${apiBaseUrl}/api/v1/assets/${asset.id}/thumbnail`}
                                      alt={asset.original_filename}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-900">
                                      {asset.original_filename}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                      {asset.width}x{asset.height}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                                      {asset.tags.length
                                        ? asset.tags.map((tag) => (
                                            <span
                                              key={`${asset.id}-${tag.tag}-${tag.source}`}
                                              className="group/tag inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1"
                                            >
                                              {tag.tag}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  void handleRemoveTag(asset.id, tag)
                                                }
                                                className="text-[10px] text-zinc-400 opacity-0 transition group-hover/tag:opacity-100"
                                                aria-label={`Remove tag ${tag.tag}`}
                                                title="Remove tag"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ))
                                        : "No tags yet"}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                                      {asset.roles.length
                                        ? asset.roles.map((role) => (
                                            <span
                                              key={`${asset.id}-${role.role}-${role.scope ?? "all"}`}
                                              className="group/role inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-800"
                                              title={
                                                role.is_published
                                                  ? "Published on site"
                                                  : "Not published"
                                              }
                                            >
                                              {roleLabel(role.role)}
                                              {role.is_published ? (
                                                <span className="text-[10px] text-amber-500">
                                                  ●
                                                </span>
                                              ) : null}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  void handleToggleRole(asset.id, role.role)
                                                }
                                                className="text-[10px] text-amber-500 opacity-0 transition group-hover/role:opacity-100"
                                                aria-label={`Remove role ${role.role}`}
                                                title="Remove role"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ))
                                        : "No roles yet"}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                      {renderRatingStars(rating)}
                                      <span className="text-xs text-zinc-500">
                                        {rating}/5
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-zinc-600">
                                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                                    Dimensions
                                  </p>
                                  <p>
                                    Original: {ratioLabel(asset.width, asset.height)} (
                                    {asset.width}x{asset.height}px)
                                  </p>
                                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                                    Derived
                                  </p>
                                  {asset.variants.length ? (
                                    <div className="space-y-1">
                                      {Object.entries(
                                        asset.variants.reduce<Record<string, string[]>>(
                                          (acc, variant) => {
                                            const key = variant.ratio;
                                            const value = `${variant.width}x${variant.height}px`;
                                            if (!acc[key]) {
                                              acc[key] = [];
                                            }
                                            if (!acc[key].includes(value)) {
                                              acc[key].push(value);
                                            }
                                            return acc;
                                          },
                                          {}
                                        )
                                      ).map(([ratio, sizes]) => (
                                        <p key={`${asset.id}-${ratio}`}>
                                          {ratio}: {sizes.join(", ")}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p>None generated yet</p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Manual tags
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      value={tagInputs[asset.id] ?? ""}
                                      onChange={(event) =>
                                        setTagInputs((prev) => ({
                                          ...prev,
                                          [asset.id]: event.target.value,
                                        }))
                                      }
                                      placeholder="portrait, family, travel"
                                      className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void handleAddTags(asset.id)}
                                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
                                    >
                                      Add
                                    </button>
                                  </div>
                                  {topicTags.length ? (
                                    <div className="flex flex-wrap gap-2">
                                      {topicTags.map((tag) => (
                                        <button
                                          key={`${asset.id}-topic-${tag.id}`}
                                          type="button"
                                          onClick={() =>
                                            handleAddTopicTag(asset.id, tag.id)
                                          }
                                          className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] text-zinc-600 transition hover:border-zinc-300"
                                        >
                                          {tag.label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Roles
                                  </label>
                                  <p className="text-xs text-zinc-500">
                                    Hero main is required and unique. Published logo/showcase
                                    assets cannot be deleted.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {ROLE_OPTIONS.map((role) => {
                                      const isActive = (
                                        roleSelections[asset.id] ?? []
                                      ).includes(role.key);
                                      const isPublished =
                                        rolePublished[asset.id]?.[role.key] ?? false;
                                      return (
                                        <div
                                          key={`${asset.id}-${role.key}`}
                                          className="flex items-center gap-2"
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handleToggleRole(asset.id, role.key)
                                            }
                                            title={role.description}
                                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                                              isActive
                                                ? "border-amber-400 bg-amber-100 text-amber-700"
                                                : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                                            }`}
                                            aria-label={`${role.label}: ${role.description}`}
                                          >
                                            {role.label}
                                          </button>
                                          {isActive && role.key === "hero_main" ? (
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                                              Published
                                            </span>
                                          ) : null}
                                          {isActive &&
                                          PUBLISHABLE_ROLES.has(role.key) &&
                                          role.key !== "hero_main" ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void handleTogglePublished(
                                                  asset.id,
                                                  role.key
                                                )
                                              }
                                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                                isPublished
                                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                  : "border-zinc-200 text-zinc-500"
                                              }`}
                                            >
                                              {isPublished ? "Published" : "Publish"}
                                            </button>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <p className="text-xs text-zinc-500">
                                    Hover a role to see how it is used.
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Rating
                                  </label>
                                  <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((value) => {
                                      const isActive =
                                        (ratingInputs[asset.id] ?? 0) >= value;
                                      return (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() =>
                                            void handleSetRating(asset.id, value)
                                          }
                                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                                            isActive
                                              ? "border-amber-400 bg-amber-100 text-amber-700"
                                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                          }`}
                                          aria-label={`Set rating to ${value}`}
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                          >
                                            <path
                                              d="M12 2.5l2.96 6 6.64.96-4.8 4.68 1.14 6.62L12 17.9l-5.94 3.12 1.14-6.62-4.8-4.68 6.64-.96L12 2.5z"
                                              fill={isActive ? "currentColor" : "none"}
                                              stroke="currentColor"
                                              strokeWidth="1.2"
                                            />
                                          </svg>
                                        </button>
                                      );
                                    })}
                                    <p className="text-xs text-zinc-500">
                                      {ratingInputs[asset.id] ?? 0}/5
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleStar(asset.id)}
                                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                        starInputs[asset.id]
                                          ? "border-amber-400 bg-amber-100 text-amber-700"
                                          : "border-zinc-200 text-zinc-600"
                                      }`}
                                    >
                                      Favorite
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Focal point
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      value={focalInputs[asset.id]?.x ?? "0.50"}
                                      onChange={(event) =>
                                        setFocalInputs((prev) => ({
                                          ...prev,
                                          [asset.id]: {
                                            ...(prev[asset.id] ?? { x: "0.50", y: "0.50" }),
                                            x: event.target.value,
                                          },
                                        }))
                                      }
                                      className="w-20 rounded-full border border-zinc-200 px-4 py-2 text-sm"
                                    />
                                    <input
                                      value={focalInputs[asset.id]?.y ?? "0.50"}
                                      onChange={(event) =>
                                        setFocalInputs((prev) => ({
                                          ...prev,
                                          [asset.id]: {
                                            ...(prev[asset.id] ?? { x: "0.50", y: "0.50" }),
                                            y: event.target.value,
                                          },
                                        }))
                                      }
                                      className="w-20 rounded-full border border-zinc-200 px-4 py-2 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void handleSaveFocal(asset.id)}
                                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Actions
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteAsset(asset.id)}
                                    disabled={!canDelete}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                      canDelete
                                        ? "border-red-200 text-red-600 hover:border-red-300"
                                        : "cursor-not-allowed border-zinc-200 text-zinc-300"
                                    }`}
                                  >
                                    Delete asset
                                  </button>
                                  {!canDelete ? (
                                    <p className="text-xs text-zinc-400">
                                      Replace published hero/logo/showcase before deleting.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500">
                      No assets match this filter.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {previewAsset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {previewAsset.original_filename}
                </p>
                <p className="text-xs text-zinc-500">
                  {previewAsset.width}x{previewAsset.height}px
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
              >
                Close
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              <img
                src={`${apiBaseUrl}/api/v1/assets/${previewAsset.id}/file`}
                alt={previewAsset.original_filename}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
