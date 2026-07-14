import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "not_implemented", message: "Billing is not implemented yet." },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Billing is not implemented yet." },
    { status: 501 }
  );
}
