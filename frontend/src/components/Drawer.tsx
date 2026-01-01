'use client'
import { useEffect } from 'react'

interface DrawerProps {
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
	title?: string
}

export default function Drawer({
	isOpen,
	onClose,
	children,
	title,
}: DrawerProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<>
			<div
				className="fixed inset-0 bg-neutral-content/70 z-40 transition-opacity"
				onClick={onClose}
			/>
			<div
				className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
					isOpen ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between p-4 border-b">
						<h2 className="text-lg font-semibold">{title || 'Filters'}</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
							aria-label="Close drawer"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">{children}</div>
				</div>
			</div>
		</>
	)
}
