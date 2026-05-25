export type GalleryMediaTag = {
	id: string;
	postMediaId: string;
	taggedMemberId: string;
	xPercent: number | null;
	yPercent: number | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	taggedMember: {
		id: string;
		name: string;
		slug: string;
		avatarUrl: string;
		status: "claimed" | "unclaimed";
	};
};

export type GalleryViewerItem = {
	id: string;
	type: "image" | "video";
	url: string;
	alt: string;
	caption?: string;
	durationLabel?: string;
	taggedMembers?: Array<{
		name: string;
		avatarUrl: string;
	}>;
	tags?: GalleryMediaTag[];
};

export type FamilyGalleryItem = {
	id: string;
	type: "IMAGE" | "VIDEO";
	url: string;
	caption: string | null;
	post: {
		id: string;
		createdAt: string | Date;
		author: {
			id: string;
			name: string;
			slug: string;
			avatarUrl: string;
		};
	};
	mediaItem: GalleryViewerItem;
};

export type FamilyGalleryResponse = {
	items: FamilyGalleryItem[];
	nextCursor: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object";
}

export function isFamilyGalleryResponse(value: unknown): value is FamilyGalleryResponse {
	if (!isRecord(value)) {
		return false;
	}

	if (!Array.isArray(value.items)) {
		return false;
	}

	if (!(typeof value.nextCursor === "string" || value.nextCursor === null)) {
		return false;
	}

	return true;
}
