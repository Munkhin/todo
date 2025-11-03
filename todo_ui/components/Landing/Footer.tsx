import Link from "next/link"
import { Github, Twitter } from "lucide-react"
import { footerStyles } from "./Footer.styles"

export default function Footer() {
  return (
    <footer className={footerStyles.footer}>
      <div className={footerStyles.container}>
        <div className={footerStyles.grid}>
          <div>
            <h4 className={footerStyles.sectionTitle}>Product</h4>
            <ul className={footerStyles.list}>
              <li><a href="#features" className={footerStyles.link}>Features</a></li>
              <li><a href="#pricing" className={footerStyles.link}>Pricing</a></li>
              <li><a href="#faq" className={footerStyles.link}>FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className={footerStyles.sectionTitle}>Company</h4>
            <ul className={footerStyles.list}>
              <li><Link href="#" className={footerStyles.link}>About</Link></li>
              <li><Link href="#" className={footerStyles.link}>Blog</Link></li>
              <li><Link href="#" className={footerStyles.link}>Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className={footerStyles.sectionTitle}>Support</h4>
            <ul className={footerStyles.list}>
              <li><Link href="#" className={footerStyles.link}>Help Center</Link></li>
              <li><Link href="#" className={footerStyles.link}>Contact</Link></li>
              <li><Link href="#" className={footerStyles.link}>Status</Link></li>
            </ul>
          </div>
          <div>
            <h4 className={footerStyles.sectionTitle}>Legal</h4>
            <ul className={footerStyles.list}>
              <li><Link href="#" className={footerStyles.link}>Privacy</Link></li>
              <li><Link href="#" className={footerStyles.link}>Terms</Link></li>
              <li><Link href="#" className={footerStyles.link}>Security</Link></li>
            </ul>
          </div>
        </div>

        <div className={footerStyles.bottom}>
          <div className={footerStyles.bottomRow}>
            <p className={footerStyles.copyright}>© {new Date().getFullYear()} Todo. All rights reserved.</p>
            <div className={footerStyles.socials}>
              <Link href="#" className={footerStyles.socialsLink} aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className={footerStyles.socialsLink} aria-label="GitHub">
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
