import * as Yup from "yup";

export const LoginSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email format").required("Email is required"),
    password: Yup.string().required("Password is required"),
})

/**
 * Candidate signup validation. DOB is entered as `DD/MM/YYYY` and transformed
 * to a Date before Yup’s date checks run.
 */
export const SignupSchema = Yup.object().shape({
    firstName: Yup.string().min(2, "Too short!").max(20, "Too long!").required("Firstname is required"),
    lastName: Yup.string().min(2, "Too short!").max(20, "Too long!").required("Lastname is required"),
    emailOrPhone: Yup.string().email("Invalid email format").required("Email is required"),
    dateOfBirth: Yup.date()
        .transform((value, originalValue) => {
            if (originalValue) {
                const [day, month, year] = originalValue.split('/');
                return new Date(`${year}-${month}-${day}`);
            }
            return value;
        })
        .required('Date of birth is required'),
    gender: Yup.string().required("Please select a gender"),
    password: Yup.string()
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/\d/, 'Password must contain at least one number')
        .matches(/[@$!%*?&]/, 'Password must contain at least one special character'),
    agreeToTerms: Yup.boolean().oneOf([true], "You must agree to terms").required("You must agree to terms")
})