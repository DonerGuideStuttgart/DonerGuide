import Link from "next/link";

export default function Footer() {
    return ( // TODO: replace links as soon as pages exist
        <footer
            className="border-t border-base p-4 text-base-content flex flex-col items-center gap-4
                lg:flex-row lg:items-center lg:justify-between">
            <aside className="text-center lg:text-left">
                <p>Dönerguide © 2025 - Prototype</p>
            </aside>

            <nav className="flex flex-col items-center gap-2 lg:flex-row lg:gap-4">
                <Link href="/impressum" className="link link-hover">Impressum</Link>
                <Link href="/datenschutz" className="link link-hover">Datenschutz</Link>
                <Link href="/kontakt" className="link link-hover">Kontakt</Link>
            </nav>

        </footer>
    );
}