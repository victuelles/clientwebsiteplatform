/** Cache tags for published pages and menus (invalidate with updateTag on save/publish). */
export const PAGES_TAG = "pages";
export const MENUS_TAG = "menus";
export const MEDIA_TAG = "media";
export const pageTag = (pageId: string) => `page-${pageId}`;
