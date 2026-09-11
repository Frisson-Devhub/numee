"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SelectInput } from "@/components/ui/SelectInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { GradientButton } from "@/components/ui/GradientButton";
import { OTPSentModal } from "@/components/ui/OTPSentModal";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { Formik, Form, ErrorMessage, FormikHelpers } from "formik";
import { SignupSchema } from "@/constants/formikSchema";
import { SignupDataInterface } from "@/interfaces/types";

/** Mask identifier for the OTP-sent modal (keeps domain / last 4 digits). */
function maskEmailOrPhone(value: string): string {
    if (!value) return "***";
    if (value.includes("@")) {
        const [local, domain] = value.split("@");
        const masked = local.slice(0, 2) + "***";
        return domain ? `${masked}@${domain}` : masked;
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 4) {
        return `****${digits.slice(-4)}`;
    }
    return "***";
}

function getTypeEmailOrPhone(value: string): string {
    if (!value) return "***";
    if (value.includes("@")) {
        return "email"
    }
    return "phone"
}



/** Candidate signup: posts to Nest, then shows OTP modal and routes to verify-code. */
export default function SignupForm() {
    const data: SignupDataInterface = {
        firstName: "",
        lastName: "",
        emailOrPhone: "",
        dateOfBirth: "",
        gender: "",
        password: "",
        agreeToTerms: false
    }
    const router = useRouter();
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [error, setError] = useState("");
    const [submittedValues, setSubmittedValues] = useState<SignupDataInterface>(data);


    const handleCreateAccount = async (values: SignupDataInterface, { setSubmitting }: FormikHelpers<SignupDataInterface>) => {
        setSubmittedValues(values);
        setError("");
        try {
            const res = await ApiCall<{ error?: string }>({
                url: apiRoutes.auth.signup,
                method: "POST",
                body: {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    emailOrPhone: values.emailOrPhone,
                    dateOfBirth: values.dateOfBirth || undefined,
                    gender: values.gender || undefined,
                    password: values.password,
                },
            });
            if (!res.ok) {
                setError(res.data?.error ?? res.error ?? "Signup failed. Please try again.");
                return;
            }
            // Store OTP expiry (3 min) so verify-code page can show countdown
            const otpExpiresAt = Date.now() + 3 * 60 * 1000;
            sessionStorage.setItem("signupOtpExpiresAt", String(otpExpiresAt));
            setShowOTPModal(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        // Check if user has already initiated signup and been redirected to verify-code
        const signupIdentifier = sessionStorage.getItem("signupIdentifier");
        if (signupIdentifier) {
            router.replace(frontendRoutes.verifyCode);
        }
    }, [router]);

    return (
        <AuthLayout fitViewport>
            <OTPSentModal
                open={showOTPModal}
                onClose={() => {
                    setShowOTPModal(false);
                    sessionStorage.setItem("signupIdentifier", submittedValues.emailOrPhone);
                    sessionStorage.setItem("signupResendAttemptsUsed", "0");
                    sessionStorage.setItem(
                        "signupResendPayload",
                        JSON.stringify({
                            firstName: submittedValues.firstName,
                            lastName: submittedValues.lastName,
                            emailOrPhone: submittedValues.emailOrPhone,
                            dateOfBirth: submittedValues.dateOfBirth || undefined,
                            gender: submittedValues.gender,
                            password: submittedValues.password,
                        })
                    );
                    router.replace(frontendRoutes.verifyCode);
                }}
                emailOrPhone={maskEmailOrPhone(submittedValues.emailOrPhone)}
                type={getTypeEmailOrPhone(submittedValues.emailOrPhone)}
            />
            <AuthFormHeading
                title="Create your account"
                subtitle="Be part of our global team, make learning great by signing up with us today!"
            />

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {error}
                </p>
            )}
            <Formik<SignupDataInterface> initialValues={{
                firstName: "",
                lastName: "",
                emailOrPhone: "",
                dateOfBirth: "",
                gender: "Male",
                password: "",
                agreeToTerms: false
            }} validationSchema={SignupSchema} onSubmit={handleCreateAccount}>
                {({ isSubmitting, setFieldValue, values }) => (
                    <Form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <LabeledInput
                                    id="firstName"
                                    type="text"
                                    label="First Name"
                                    value={values.firstName}
                                    onChange={(e) => setFieldValue("firstName", e.target.value)}
                                    placeholder="John"

                                />
                                <ErrorMessage name="firstName" component="div" className="text-red-600 text-sm mt-1.5" />
                            </div>
                            <div>

                                <LabeledInput
                                    id="lastName"
                                    type="text"
                                    label="Last Name"
                                    value={values.lastName}
                                    onChange={(e) => setFieldValue("lastName", e.target.value)}
                                    placeholder="Doe"

                                />
                                <ErrorMessage name="lastName" component="div" className="text-red-600 text-sm mt-1.5" />
                            </div>
                        </div>

                        <LabeledInput
                            id="emailOrPhone"
                            type="text"
                            label="Email or Phone Number"
                            value={values.emailOrPhone}
                            onChange={(e) => setFieldValue("emailOrPhone", e.target.value)}
                            placeholder="admin@numee.com"

                        />
                        <ErrorMessage name="emailOrPhone" component="div" className="text-red-600 text-sm" />
                        <div className="grid grid-cols-2 gap-4 text-gray-700">
                            <div>

                                <DatePicker
                                    id="dateOfBirth"
                                    label="Date of Birth"
                                    placeholder="dd/mm/yyyy"
                                    value={values.dateOfBirth}
                                    onChange={(val) => setFieldValue("dateOfBirth", val)}
                                />
                                <ErrorMessage name="dateOfBirth" component="div" className="text-red-600 text-sm mt-1.5" />
                            </div>
                            <div>

                                <SelectInput
                                    id="gender"
                                    label="Gender"
                                    value={values.gender}
                                    onChange={(e) => setFieldValue("gender", e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </SelectInput>
                                <ErrorMessage name="gender" component="div" className="text-red-600 text-sm" />
                            </div>
                        </div>

                        <PasswordInput
                            id="password"
                            label="Password"
                            value={values.password}
                            onChange={(e) => setFieldValue("password", e.target.value)}
                            placeholder="••••••••••"
                        />
                        <ErrorMessage name="password" component="div" className="text-red-600 text-sm" />
                        <CheckboxField
                            id="agreeToTerms"
                            alignTop
                            checked={values.agreeToTerms}
                            onChange={(e) => setFieldValue("agreeToTerms", e.target.checked)}
                            label={
                                <>
                                    I agree to the{" "}
                                    <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700">
                                        Terms of use
                                    </Link>{" "}
                                    and{" "}
                                    <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700">
                                        Privacy Policy
                                    </Link>
                                    .
                                </>
                            }
                        />
                        <ErrorMessage name="agreeToTerms" component="div" className="text-red-600 text-sm" />

                        <GradientButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating…" : "Create Account"}
                        </GradientButton>
                    </Form>
                )}
            </Formik>
            <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                    Sign In
                </Link>
            </p>
        </AuthLayout>
    );
}
