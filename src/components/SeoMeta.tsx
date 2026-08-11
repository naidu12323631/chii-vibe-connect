import { useEffect } from "react";

export const SITE_URL = "https://miloumingle.vercel.app";

type SeoMetaProps = {
  title: string;
  description: string;
  path: string;
  type?: string;
  image?: string;
  noIndex?: boolean;
  jsonLd?: object[];
};

const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const SeoMeta = ({
  title,
  description,
  path,
  type = "website",
  image = `${SITE_URL}/favicon.svg`,
  noIndex = false,
  jsonLd = [],
}: SeoMetaProps) => {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    upsertMeta("name", "description", description);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", "milo");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    if (noIndex) {
      upsertMeta("name", "robots", "noindex, nofollow");
    } else {
      document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
    }

    let jsonLdEl = document.getElementById("seo-jsonld") as HTMLScriptElement | null;
    if (!jsonLdEl) {
      jsonLdEl = document.createElement("script");
      jsonLdEl.id = "seo-jsonld";
      jsonLdEl.type = "application/ld+json";
      document.head.appendChild(jsonLdEl);
    }
    jsonLdEl.textContent = JSON.stringify(jsonLd);
  }, [title, description, path, type, image, noIndex, jsonLd]);

  return null;
};

export default SeoMeta;