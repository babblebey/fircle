import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("gallery navigation and route wiring", () => {
  it("includes Gallery in desktop and mobile nav items", () => {
    const desktop = readSource("src/components/nav/desktop-sidebar.tsx");
    const mobile = readSource("src/components/nav/mobile-bottom-nav.tsx");

    expect(desktop).toContain('{ href: "/gallery", label: "Gallery"');
    expect(mobile).toContain('{ href: "/gallery", label: "Gallery"');
  });

  it("wires /gallery page to gallery grid and existing media viewer dialog", () => {
    const galleryPage = readSource("src/app/(app)/gallery/page.tsx");

    expect(galleryPage).toContain("<GalleryBentoGrid");
    expect(galleryPage).toContain("<MediaViewerDialog");
    expect(galleryPage).toContain("onTileClick={openViewer}");
  });
});

describe("member gallery profile integration", () => {
  it("adds gallery tab to both profile routes", () => {
    const profilePage = readSource("src/app/(app)/profile/page.tsx");
    const memberPage = readSource("src/app/(app)/member/[slug]/page.tsx");

    expect(profilePage).toContain('type ProfileTab = "posts" | "tagged" | "liked" | "gallery"');
    expect(memberPage).toContain('type ProfileTab = "posts" | "tagged" | "liked" | "gallery"');
    expect(profilePage).toContain("<MemberGalleryTab");
    expect(memberPage).toContain("<MemberGalleryTab");
  });

  it("uses media-tag based member gallery query and gallery tiles", () => {
    const memberGalleryTab = readSource("src/components/gallery/member-gallery-tab.tsx");

    expect(memberGalleryTab).toContain("api.media.getMemberGallery.useQuery");
    expect(memberGalleryTab).toContain("<GalleryBentoGrid");
    expect(memberGalleryTab).toContain("<MediaViewerDialog");
  });
});

describe("gallery tile media affordances", () => {
  it("renders both image and video affordances in tile primitive", () => {
    const tile = readSource("src/components/gallery/gallery-media-tile.tsx");

    expect(tile).toContain("<video");
    expect(tile).toContain("<Image");
    expect(tile).toContain("<PlayCircle");
  });
});
