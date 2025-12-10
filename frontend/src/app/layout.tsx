import type {Metadata} from 'next'
import {Rubik} from 'next/font/google'
import './globals.css'

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const rubikSans = Rubik({
    variable: '--font-rubik-sans',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: {
        template: '%s | Dönerguide Stuttgart',
        default: 'Dönerguide Stuttgart',
    },
    description: 'Eine Web-App, um den besten Döner in Stuttgart zu finden.',
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="de">
        <body className={`${rubikSans.className} antialiased bg-base-300`}>
        <nav className={"pb-16"}><Navbar/></nav>
        <main className={"px-4 pb-4"}>{children}</main>
        <Footer/>
        </body>
        </html>
    )
}
