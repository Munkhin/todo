"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useUserId } from "@/hooks/use-user-id"
import { useSettings } from "@/hooks/use-settings"
import { onboardingStyles } from "./OnboardingOverlay.styles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ChevronRight, ChevronLeft, Plus, X, Check } from "lucide-react"
import EnergyGraph from "@/components/Settings/EnergyGraph"
import DurationInput from "@/components/Settings/DurationInput"
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
            await submit({
                subjects,
                tests,
                preferences,
                additional_notes: additionalNotes
            })
            setIsVisible(false)
        } catch (error) {
            console.error("Onboarding failed:", error)
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
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-64 h-64 bg-gray-100 rounded-full mb-8 flex items-center justify-center">
                            {/* Placeholder for illustration */}
                            <span className="text-gray-400">Welcome Illustration</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to your new productivity hub</h2>
                        <p className="text-gray-600 max-w-md">
                            We'll help you organize your tasks, schedule your study sessions, and optimize your learning based on your energy levels.
                        </p>
                    </div>
                )

            case 1: // Subjects
                return (
                    <div className="space-y-6">
                        <div className="flex gap-3">
                            <Input
                                placeholder="e.g. Linear Algebra"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                                className="flex-1"
                            />
                            <Button onClick={addSubject} type="button" className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Add
                            </Button>
                        </div>

                        <div className="grid gap-3">
                            {subjects.map((subject, i) => (
                                <div key={i} className={onboardingStyles.itemCard}>
                                    <span className={onboardingStyles.itemText}>{subject}</span>
                                    <button onClick={() => removeSubject(i)} className={onboardingStyles.removeBtn}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {subjects.length === 0 && (
                                <p className="text-center text-gray-400 py-8">No subjects added yet</p>
                            )}
                        </div>
                    </div>
                )

            case 2: // Tests
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Test Name</label>
                                <Input
                                    placeholder="e.g. Midterm Exam"
                                    value={newTestName}
                                    onChange={(e) => setNewTestName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Date</label>
                                <Input
                                    type="date"
                                    value={newTestDate}
                                    onChange={(e) => setNewTestDate(e.target.value)}
                                />
                            </div>
                            <Button onClick={addTest} type="button" disabled={!newTestName || !newTestDate} className="w-full bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Add Test
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
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case 3: // Wake/Sleep
                return (
                    <div className={onboardingStyles.grid2}>
                        <label className={onboardingStyles.label}>
                            Wake Time (hour, 0-23)
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={preferences.wake_time}
                                onChange={(e) => updatePreference('wake_time', Number(e.target.value))}
                                className="mt-2"
                            />
                        </label>
                        <label className={onboardingStyles.label}>
                            Sleep Time (hour, 0-23)
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={preferences.sleep_time}
                                onChange={(e) => updatePreference('sleep_time', Number(e.target.value))}
                                className="mt-2"
                            />
                        </label>
                    </div>
                )

            case 4: // Study Duration
                return (
                    <div className="space-y-6">
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
                )

            case 5: // Breaks
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="font-medium text-gray-900">Enable Breaks</span>
                            <input
                                type="checkbox"
                                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={preferences.insert_breaks}
                                onChange={(e) => updatePreference('insert_breaks', e.target.checked)}
                            />
                        </div>

                        {preferences.insert_breaks && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
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
                )

            case 6: // Energy
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Drag the sliders to adjust your energy levels throughout the day. High energy times are best for difficult tasks.
                        </p>
                        <EnergyGraph
                            wakeHour={preferences.wake_time}
                            sleepHour={preferences.sleep_time}
                            energyLevels={preferences.energy_levels}
                            onChange={(levels) => updatePreference('energy_levels', levels)}
                        />
                    </div>
                )

            case 7: // Notes
                return (
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
                )

            default:
                return null
        }
    }

    return (
        <div className={onboardingStyles.overlay}>
            <div className={onboardingStyles.container}>
                {/* Progress Bar */}
                <div className={onboardingStyles.progressContainer}>
                    <div
                        className={onboardingStyles.progressBar}
                        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className={onboardingStyles.header}>
                    <div>
                        <h1 className={onboardingStyles.title}>{STEPS[currentStep].title}</h1>
                        <p className={onboardingStyles.subtitle}>{STEPS[currentStep].subtitle}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                        Step {currentStep + 1} of {STEPS.length}
                    </div>
                </div>

                {/* Content */}
                <div className={onboardingStyles.content}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className={onboardingStyles.footer}>
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button onClick={handleBack} className={onboardingStyles.secondaryBtn}>
                                Back
                            </button>
                        )}
                        <button onClick={handleSkip} className={onboardingStyles.skipBtn}>
                            Skip this step
                        </button>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className={onboardingStyles.primaryBtn}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Setting up...
                            </>
                        ) : currentStep === STEPS.length - 1 ? (
                            <>
                                Complete Setup
                                <Check className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
