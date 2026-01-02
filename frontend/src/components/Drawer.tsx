'use client'
import Close from '@/assets/icons/close.svg'
import { useEffect } from 'react'

interface Props {
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
	title?: string
}

export default function Drawer({ isOpen, onClose, children, title }: Props) {
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
				className={`fixed top-0 right-0 h-full w-90 max-w-[90vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
					isOpen ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between pt-4 px-4 pb-2">
						<h2 className="text-lg font-semibold">{title || 'Filters'}</h2>
						<button
							onClick={onClose}
							className="hover:bg-neutral-content/30 rounded-full transition-colors p-3"
							aria-label="Close drawer"
						>
							<Close className="size-3.5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto">{children}</div>
				</div>
			</div>
		</>
	)
}
