type Props = {
	text: string
	icon?: React.ReactNode
	className?: string
}

export default function Badge({ text, icon, className }: Props) {
	return (
		<div className={`badge badge-outline ${className} rounded-full space-x-1`}>
			{icon}
			{text}
		</div>
	)
}
