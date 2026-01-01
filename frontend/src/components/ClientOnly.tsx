'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

type ClientOnlyProps = {
	children: ReactNode
	fallback?: ReactNode
}

function subscribe(): () => void {
	return () => {}
}

function getServerSnapshot(): boolean {
	return false
}

function getClientSnapshot(): boolean {
	return true
}

export default function ClientOnly({
	children,
	fallback = null,
}: ClientOnlyProps) {
	const isClient = useSyncExternalStore(
		subscribe,
		getClientSnapshot,
		getServerSnapshot,
	)

	return <>{isClient ? children : fallback}</>
}
