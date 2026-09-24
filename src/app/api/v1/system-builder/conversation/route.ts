import { POST as conversationPost } from "@/app/api/v1/onboarding/sessions/[sessionId]/conversation/route";

export async function POST(request: Request) {
	const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
	return conversationPost(request, { params: Promise.resolve({ sessionId }) });
}
