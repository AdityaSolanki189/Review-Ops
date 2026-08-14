import type { Variants } from 'framer-motion'

export const fadeInUp: Variants = {
    initial: {
        opacity: 0,
        y: 40,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
}

export const staggerItem: Variants = {
    initial: {
        opacity: 0,
        y: 30,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const scaleIn: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.7,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const fadeInLeft: Variants = {
    initial: {
        opacity: 0,
        x: -30,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const fadeInRight: Variants = {
    initial: {
        opacity: 0,
        x: 30,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const slideInFromBottom: Variants = {
    initial: {
        opacity: 0,
        y: 60,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.6, -0.05, 0.01, 0.99],
        },
    },
}

export const defaultViewport = {
    once: true,
    amount: 0.1,
    margin: '0px 0px -100px 0px',
}
