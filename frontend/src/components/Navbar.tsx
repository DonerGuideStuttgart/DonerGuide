import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="w-full bg-white shadow-sm">
            <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
                <Link href="/">
                    <a className="text-lg font-semibold">Dönerguide Stuttgart</a>
                </Link>
                <div>
                    <Link href="/stores">
                        <a className="ml-4 text-sm">Stores</a>
                    </Link>
                </div>
            </div>
        </nav>
    );
}