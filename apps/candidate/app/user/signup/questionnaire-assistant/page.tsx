import { AnamAssistant } from "@/components/dashboard/AnamAssistant";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";

export default function QuestionnaireAssistantPage() {
    return (
        <AuthLayout
            maxWidth="max-w-4xl"
            rightPanelOverflow
            hideSidebar
            background="bg-gradient-to-br from-blue-500 to-orange-500 relative overflow-hidden"
        >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-125 h-125 bg-blue-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-125 h-125 bg-orange-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y/2 pointer-events-none" />

            <div className="relative z-10">
                <AuthFormHeading
                    title="Questionnaire Assistant"
                    subtitle="Talk to Numi — AI assistant. Get help with your signup questionnaire."
                    dark
                />
                <div className="mt-8">
                    <AnamAssistant />
                </div>
            </div>
        </AuthLayout>
    );
}
