'use client'

import ErrorPage from './error'

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html>
			<body>
				<ErrorPage error={error} reset={reset} />
			</body>
		</html>
	)
}
