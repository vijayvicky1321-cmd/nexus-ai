import { ModuleStub } from "@/components/app/module-stub";
import { getModule } from "@/lib/modules";

export default function AccountPage() {
  return <ModuleStub module={getModule("account")!} />;
}
