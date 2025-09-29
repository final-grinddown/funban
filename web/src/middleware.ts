import { auth } from "@/auth"

export default auth(() => {

})

export const config = {
	matcher: [
		"/((?!sign-in|$).*)", // Protect all routes except "/" and "/sign-in"
	],
}
