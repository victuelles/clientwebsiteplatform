import { NotFoundContent } from "@/components/site/not-found-content";

// Rendered inside the (public) layout (e.g. notFound() from [[...slug]]), which adds the chrome.
export default function NotFound() {
  return <NotFoundContent />;
}
