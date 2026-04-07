import {createFileRoute, redirect} from "@tanstack/react-router";
import {z} from "zod";

const verifyEmailSearchSchema = z.object({
	isVerificationEmailSent: z
		.string()
		.optional()
		.transform((val) => val === 'true')
		.default(false),
})

export const Route = createFileRoute('/auth/verify-email')({
	component: RouteComponent,

	validateSearch: (search) => verifyEmailSearchSchema.parse(search),

	beforeLoad: ({ context }) => {
		const { user, isAuthenticated, _hasHydrated } = context.auth;

		if (!user && _hasHydrated) {
			throw redirect({ to: '/auth/login' })
		}

		if (isAuthenticated) {
			throw redirect({ to: '/app' })
		}
	}
});


export function RouteComponent() {
	const { isVerificationEmailSent } = Route.useSearch();

	return (
		<div>
			<p>
				placeholder //TODO make an actual page and a component and put it here.
			</p>
			<p>
				Send verification email: {isVerificationEmailSent ? 'Yes' : 'No'}
			</p>
		</div>
	)
}