"use client";

import type { Variants } from "framer-motion";

export { motion, AnimatePresence } from "framer-motion";

// Typography fade: used directly on motion.h1 / motion.p
// Only translates — the page wrapper handles opacity so these don't stack.
export const fadeInUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" as const },
};

// Card stagger: container triggers children in sequence
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.05,
        },
    },
};

export const staggerItem: Variants = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};
