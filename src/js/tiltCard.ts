/**
 * * Initialize tilt cards
 * This adds a tilt effect to any elements on the page with the class "tilt-card"
 */
export default function initTiltCards() {
	const cards = document.querySelectorAll(".tilt-card");

	cards.forEach((card) => {
		// Variables for tilt effect
		const maxTilt = 8; // Maximum tilt in degrees
		const perspective = 1000; // Perspective value for 3D effect

		// Add perspective to parent for 3D effect
		(card as HTMLElement).style.perspective = `${perspective}px`;

		// Mouse enter event
		card.addEventListener(
			"mouseenter",
			() => {
				(card as HTMLElement).style.transition = "transform 0.5s ease-out";
			},
			{ passive: true },
		);

		// Mouse move event for tilt effect
		card.addEventListener(
			"mousemove",
			(e: MouseEvent) => {
				const rect = card.getBoundingClientRect();
				const centerX = rect.left + rect.width / 2;
				const centerY = rect.top + rect.height / 2;

				// Calculate mouse position relative to card center (in percentage)
				const mouseX = (e.clientX - centerX) / (rect.width / 2);
				const mouseY = (e.clientY - centerY) / (rect.height / 2);

				// Calculate tilt angles
				const tiltX = -mouseY * maxTilt;
				const tiltY = mouseX * maxTilt;

				// Apply transform
				(card as HTMLElement).style.transform =
					`perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
			},
			{ passive: true },
		);

		// Mouse leave event to reset
		card.addEventListener(
			"mouseleave",
			() => {
				(card as HTMLElement).style.transition = "transform 0.5s ease-out";
				(card as HTMLElement).style.transform =
					"perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
			},
			{ passive: true },
		);
	});
}
