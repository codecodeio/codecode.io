import { type SiteDataProps } from "../types/configDataTypes";

// Update this file with your site specific information
const siteData: SiteDataProps = {
	name: "CodeCode",
	// Your website's title and description (meta fields)
	title:
		"Simplifying tech with straightforward tutorials made with great care.",
	description:
		"CodeCode is an independent publication launched in January 2023 by Matthew Gold. Subscribe today to receive new posts in your email. Your subscription makes this site possible and allows CodeCode to continue to exist. Thank you!",

	// Your information for blog post purposes
	author: {
		name: "Matthew Gold",
		email: "matt@codecode.io",
		twitter: "codecodeio",
	},

	// default image for meta tags if the page doesn't have an image already
	defaultImage: {
		src: "/images/codecode-logo.png",
		alt: "CodeCode logo",
	},
};

export default siteData;