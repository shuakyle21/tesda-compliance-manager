import { requireAuthenticatedUser } from "@/modules/auth/data/auth";
import { SwaggerUIViewer } from "./SwaggerUIViewer";

export default async function ApiDocsPage() {
  await requireAuthenticatedUser();
  return <SwaggerUIViewer />;
}
