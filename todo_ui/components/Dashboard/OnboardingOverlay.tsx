"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useUserId } from "@/hooks/use-user-id"
import { useSettings } from "@/hooks/use-settings"
import { onboardingStyles } from "./OnboardingOverlay.styles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ChevronRight, ChevronLeft, Plus, X, Check, ArrowRight } from "lucide-react"
import EnergyGraph from "@/components/Settings/EnergyGraph"
import DurationInput from "@/components/Settings/DurationInput"
import SmartTimeInput from "@/components/Settings/SmartTimeInput"
import { TestItem } from "@/lib/api/onboarding"

// Steps definition
const STEPS = [
    { id: 'welcome', title: 'Welcome to Todo', subtitle: "Let's personalize your experience" },
    { id: 'subjects', title: 'What are you studying?', subtitle: "Add your current subjects or courses" },
    { id: 'tests', title: 'Upcoming Tests', subtitle: "Do you have any exams coming up?" },
    { id: 'wake_sleep', title: 'Daily Schedule', subtitle: "When do you usually start and end your day?" },
    { id: 'study_duration', title: 'Study Preferences', subtitle: "How long do you like to study?" },
    { id: 'breaks', title: 'Breaks & Rest', subtitle: "Regular breaks help maintain focus" },
    { id: 'energy', title: 'Energy Levels', subtitle: "When are you most productive?" },
    { id: 'notes', title: 'Final Touches', subtitle: "Anything else we should know?" },
]

export default function OnboardingOverlay() {
    const userId = useUserId()
    const { isOnboarded, isSettingsLoading, submit, isSubmitting } = useOnboarding(userId)
    const { settings: defaultSettings } = useSettings(userId)

    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    // Form State
    const [subjects, setSubjects] = useState<string[]>([])
    const [newSubject, setNewSubject] = useState("")

    const [tests, setTests] = useState<TestItem[]>([])
    const [newTestName, setNewTestName] = useState("")
    const [newTestDate, setNewTestDate] = useState("")

    const [preferences, setPreferences] = useState(defaultSettings)
    const [additionalNotes, setAdditionalNotes] = useState("")

    // Sync preferences with defaults when loaded
    useEffect(() => {
        if (defaultSettings) {
            setPreferences(prev => ({ ...prev, ...defaultSettings }))
        }
    }, [defaultSettings])

    // Show overlay only if not onboarded and not loading
    useEffect(() => {
        if (!isSettingsLoading && !isOnboarded && userId) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [isSettingsLoading, isOnboarded, userId])

    if (!isVisible) return null

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleComplete()
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const handleSkip = () => {
        handleNext()
    }

    const handleComplete = async () => {
        try {
            // Ensure preferences has all required fields with defaults
            const completePreferences = {
                due_date_days: preferences.due_date_days ?? null,
                wake_time: preferences.wake_time ?? 7,
                sleep_time: preferences.sleep_time ?? 22,
                min_study_duration: preferences.min_study_duration ?? 30,
                max_study_duration: preferences.max_study_duration ?? 90,
                energy_levels: preferences.energy_levels ?? {},
                insert_breaks: preferences.insert_breaks ?? true,
                short_break_min: preferences.short_break_min ?? 5,
                long_break_min: preferences.long_break_min ?? 15,
                long_study_threshold_min: preferences.long_study_threshold_min ?? 60,
                min_gap_for_break_min: preferences.min_gap_for_break_min ?? 90,
                onboarding_completed: true
            }

            await submit({
                subjects: subjects,
                tests: tests,
                preferences: completePreferences,
                additional_notes: additionalNotes || undefined
            })
            setIsVisible(false)
        } catch (error) {
            console.error("Onboarding failed:", error)
            alert("Failed to complete onboarding. Please try again.")
        }
    }

    const addSubject = () => {
        if (newSubject.trim()) {
            setSubjects([...subjects, newSubject.trim()])
            setNewSubject("")
        }
    }

    const removeSubject = (index: number) => {
        setSubjects(subjects.filter((_, i) => i !== index))
    }

    const addTest = () => {
        if (newTestName.trim() && newTestDate) {
            setTests([...tests, { name: newTestName.trim(), date: newTestDate }])
            setNewTestName("")
            setNewTestDate("")
        }
    }

    const removeTest = (index: number) => {
        setTests(tests.filter((_, i) => i !== index))
    }

    const updatePreference = (key: string, value: any) => {
        setPreferences(prev => ({ ...prev, [key]: value }))
    }

    // Render Step Content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Welcome
                return (
                    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                        <h2 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">Welcome to Todo</h2>
                        <p className="text-xl text-gray-500 mb-12 leading-relaxed">
                            We'll help you organize your tasks, schedule your study sessions, and optimize your learning based on your energy levels.
                        </p>
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Illustration</span>
                        </div>
                    </div>
                )

            case 1: // Subjects
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Subjects Illustration</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <Input
                                    placeholder="e.g. Linear Algebra"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                                    className={onboardingStyles.input}
                                />
                                <Button onClick={addSubject} type="button" className="h-auto px-6 bg-blue-600 hover:bg-blue-700 rounded-2xl">
                                    <Plus className="w-6 h-6" />
                                </Button>
                            </div>

                            <div className="grid gap-3">
                                {subjects.map((subject, i) => (
                                    <div key={i} className={onboardingStyles.itemCard}>
                                        <span className={onboardingStyles.itemText}>{subject}</span>
                                        <button onClick={() => removeSubject(i)} className={onboardingStyles.removeBtn}>
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {subjects.length === 0 && (
                                    <p className="text-center text-gray-400 py-8">No subjects added yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                )

            case 2: // Tests
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Tests Illustration</span>
                        </div>
                        <div className="space-y-6">
                            <div className="grid gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <div className="space-y-2">
                                    <label className={onboardingStyles.label}>Test Name</label>
                                    <Input
                                        placeholder="e.g. Midterm Exam"
                                        value={newTestName}
                                        onChange={(e) => setNewTestName(e.target.value)}
                                        className={onboardingStyles.input}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={onboardingStyles.label}>Date</label>
                                    <Input
                                        type="date"
                                        value={newTestDate}
                                        onChange={(e) => setNewTestDate(e.target.value)}
                                        className={onboardingStyles.input}
                                    />
                                </div>
                                <Button onClick={addTest} type="button" disabled={!newTestName || !newTestDate} className="w-full py-6 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg">
                                    <Plus className="w-5 h-5 mr-2" /> Add Test
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {tests.map((test, i) => (
                                    <div key={i} className={onboardingStyles.itemCard}>
                                        <div>
                                            <div className={onboardingStyles.itemText}>{test.name}</div>
                                            <div className={onboardingStyles.itemSubtext}>{new Date(test.date).toLocaleDateString()}</div>
                                        </div>
                                        <button onClick={() => removeTest(i)} className={onboardingStyles.removeBtn}>
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )

            case 3: // Wake/Sleep
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Schedule Illustration</span>
                        </div>
                        <div className={onboardingStyles.grid2}>
                            <div className="space-y-2">
                                <SmartTimeInput
                                    label="Wake Time"
                                    value={preferences.wake_time}
                                    onChange={(val) => updatePreference('wake_time', val)}
                                />
                            </div>
                            <div className="space-y-2">
                                <SmartTimeInput
                                    label="Sleep Time"
                                    value={preferences.sleep_time}
                                    onChange={(val) => updatePreference('sleep_time', val)}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 4: // Study Duration
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Study Duration Illustration</span>
                        </div>
                        <div className="space-y-8">
                            <DurationInput
                                label="Minimum Study Session"
                                value={preferences.min_study_duration}
                                minMinutes={15}
                                plainNumberUnit="minutes"
                                onChange={(minutes) => updatePreference('min_study_duration', minutes)}
                            />
                            <DurationInput
                                label="Maximum Study Session"
                                value={preferences.max_study_duration}
                                maxMinutes={300}
                                plainNumberUnit="minutes"
                                onChange={(minutes) => updatePreference('max_study_duration', minutes)}
                            />
                        </div>
                    </div>
                )

            case 5: // Breaks
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Breaks Illustration</span>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
                                <span className="font-medium text-gray-900 text-lg">Enable Breaks</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={preferences.insert_breaks}
                                        onChange={(e) => updatePreference('insert_breaks', e.target.checked)}
                                    />
                                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {preferences.insert_breaks && (
                                <div className="space-y-8 animate-in slide-in-from-top-4 fade-in duration-300">
                                    <DurationInput
                                        label="Short Break Duration"
                                        value={preferences.short_break_min}
                                        minMinutes={1}
                                        onChange={(minutes) => updatePreference('short_break_min', minutes)}
                                    />
                                    <DurationInput
                                        label="Long Break Duration"
                                        value={preferences.long_break_min}
                                        minMinutes={5}
                                        onChange={(minutes) => updatePreference('long_break_min', minutes)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )

            case 6: // Energy
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Energy Illustration</span>
                        </div>
                        <div className="space-y-4">
                            <p className="text-lg text-gray-500">
                                Drag the graph to adjust your energy levels throughout the day.
                            </p>
                            <EnergyGraph
                                wakeHour={preferences.wake_time}
                                sleepHour={preferences.sleep_time}
                                energyLevels={preferences.energy_levels}
                                onChange={(levels) => updatePreference('energy_levels', levels)}
                            />
                        </div>
                    </div>
                )

            case 7: // Notes
                return (
                    <div className="space-y-8">
                        <div className={onboardingStyles.illustrationPlaceholder}>
                            <span className="text-gray-400 font-medium">Notes Illustration</span>
                        </div>
                        <div className="space-y-4">
                            <label className={onboardingStyles.label}>
                                Is there anything else you'd like us to know about your study habits or schedule?
                            </label>
                            <textarea
                                className={onboardingStyles.textarea}
                                placeholder="e.g. I prefer studying in the mornings, I have soccer practice on Tuesdays..."
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className={onboardingStyles.overlay}>
            <div className={onboardingStyles.container}>
                {/* Header */}
                <div className={onboardingStyles.header}>
                    <div className="flex flex-col gap-6 w-full">
                        {/* Progress Pills */}
                        <div className={onboardingStyles.progressContainer}>
                            {STEPS.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`h-2 rounded-full transition-all duration-500 ${index === currentStep
                                        ? "w-12 bg-blue-600"
                                        : index < currentStep
                                            ? "w-2 bg-blue-200"
                                            : "w-2 bg-gray-200"
                                        }`}
                                />
                            ))}
                        </div>

                        {currentStep > 0 && (
                            <div>
                                <h1 className={onboardingStyles.title}>{STEPS[currentStep].title}</h1>
                                <p className={onboardingStyles.subtitle}>{STEPS[currentStep].subtitle}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className={onboardingStyles.content}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className={onboardingStyles.footer}>
                    <button onClick={handleSkip} className={onboardingStyles.skipBtn}>
                        Skip
                    </button>

                    <div className="flex gap-4">
                        {currentStep > 0 && (
                            <button onClick={handleBack} className={onboardingStyles.secondaryBtn}>
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={onboardingStyles.primaryBtn}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Setting up...
                                </>
                            ) : currentStep === STEPS.length - 1 ? (
                                <>
                                    Complete Setup
                                    <Check className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

