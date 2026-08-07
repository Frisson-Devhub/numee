import {
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
    User,
    ClipboardCheck,
    Brain,
    Network,
    LayoutDashboard,
    Users,
    GraduationCap,
    BarChart3,
    Megaphone,
    Hourglass,
} from "lucide-react";

export const adminSidebarNavigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "User Management", href: "/admin/user-management", icon: Users },
    // { name: "University Management", href: "/admin/university-management", icon: GraduationCap },
    { name: "Analytics Reports", href: "/admin/analytics", icon: BarChart3 },
    { name: "Communication", href: "/admin/communication", icon: Megaphone },
    { name: "Logs & Audits", href: "/admin/logs-audits", icon: Hourglass },
];

export const navLinks = [
    { href: "#about", label: "About Us" },
    { href: "#features", label: "Why Us" },
    { href: "#pricing", label: "Our Features" },
    { href: "#blog", label: "Survey" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#contact", label: "Contacts" },
];

export const companyLinks = [
    { label: "About Us", href: "#about" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Partners", href: "#" },
];

export const productLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How it Works", href: "#features" },
    { label: "Testimonials", href: "#testimonials" },
];

export const resourceLinks = [
    { label: "Blog", href: "#blog" },
    { label: "FAQ", href: "#" },
    { label: "Support", href: "#" },
    { label: "Privacy Policy", href: "#" },
];

export const social = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
];

export const partnerBenefits = [
    "Personalized Roadmaps",
    "Skill Gap Analysis",
    "Goal Tracking",
];

export const processSteps = [
    { num: 1, title: "Discover", description: "Clarify your goals and explore possibilities." },
    { num: 2, title: "Assess", description: "Understand your current skills and gaps." },
    { num: 3, title: "Plan", description: "Get a personalized roadmap tailored to you." },
    { num: 4, title: "Learn", description: "Access resources and build in-demand skills." },
    { num: 5, title: "Apply", description: "Practice and prepare for real opportunities." },
    { num: 6, title: "Grow", description: "Track progress and keep advancing." },
];

export const successMirrorFeatures = [
    "Personalized Mentoring",
    "Skill Development",
    "Career Roadmap",
    "Interview Preparation",
];

export const roadmapFeatures = [
    {
        icon: User,
        title: "Personalized Roadmap",
        description: "A step-by-step plan tailored to your goals, timeline, and current skills so you know exactly what to do next.",
    },
    {
        icon: ClipboardCheck,
        title: "Skill Assessments",
        description: "Objective assessments that map your strengths and gaps against real job requirements and industry standards.",
    },
    {
        icon: Brain,
        title: "AI-Powered Mentorship",
        description: "Your AI mentor answers questions, suggests resources, and keeps you accountable on your career journey.",
    },
    {
        icon: Network,
        title: "Networking Opportunities",
        description: "Connect with peers and mentors, join events, and grow your professional network in line with your roadmap.",
    },
];
