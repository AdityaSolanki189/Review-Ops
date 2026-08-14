import { CLASSIFIER_VERSION } from '@/lib/classification/topics'

export function isReclassificationEligible(topicCount: number, classifierVersion: number | null | undefined): boolean {
    return (
        topicCount === 0 ||
        classifierVersion === null ||
        classifierVersion === undefined ||
        classifierVersion < CLASSIFIER_VERSION
    )
}
