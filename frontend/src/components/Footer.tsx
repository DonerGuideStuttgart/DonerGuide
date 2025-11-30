import Link from "next/link";

export default function Footer() {
    return ( <!--TODO: fix mobile layout-->
        <footer className={"footer lg:footer-vertical footer-center bg-base-300 text-base-content border-base border-t p-4"}>
            <div>
                <aside>
                    <p>Dönerguide © 2025 - Prototype</p>

                </aside>
            </div>
            <div>
                <nav className={"grid grid-flow-col gap-4"}>
                    <Link href={"/"} className={"link link-hover"}>Impressum</Link>
                    <Link href={"/"} className={"link link-hover"}>Datenschutz</Link>
                    <Link href={"/"} className={"link link-hover"}>Kontakt</Link>
                </nav>
            </div>
        </footer>
    );
}