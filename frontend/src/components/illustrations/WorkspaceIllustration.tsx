type WorkspaceIllustrationProps = { className?: string; label?: string };

/** Original, code-native GITNOVA artwork. Purely decorative; it carries no product data. */
export default function WorkspaceIllustration({ className = "", label = "Illustration of repository modules connected around a developer workspace" }: WorkspaceIllustrationProps) {
  return (
    <svg className={className} viewBox="0 0 520 390" role="img" aria-label={label} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="workspaceScreen" x1="146" y1="120" x2="364" y2="282" gradientUnits="userSpaceOnUse"><stop stopColor="#8060F6"/><stop offset="1" stopColor="#302052"/></linearGradient>
        <linearGradient id="workspaceJacket" x1="203" y1="178" x2="330" y2="342" gradientUnits="userSpaceOnUse"><stop stopColor="#D4C8FF"/><stop offset="1" stopColor="#7652EC"/></linearGradient>
        <filter id="workspaceBlur" x="30" y="10" width="460" height="370" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <ellipse cx="261" cy="204" rx="179" ry="132" fill="#7655F7" fillOpacity=".17" filter="url(#workspaceBlur)"/>
      <circle cx="79" cy="102" r="28" fill="#211A33" stroke="#B8A5FF" strokeOpacity=".44"/>
      <circle cx="79" cy="102" r="8" fill="#B8A5FF"/>
      <circle cx="421" cy="95" r="22" fill="#211A33" stroke="#B8A5FF" strokeOpacity=".4"/>
      <circle cx="421" cy="95" r="6" fill="#A58AFF"/>
      <circle cx="443" cy="284" r="24" fill="#211A33" stroke="#B8A5FF" strokeOpacity=".35"/>
      <circle cx="443" cy="284" r="7" fill="#D8FF8F"/>
      <circle cx="91" cy="296" r="19" fill="#211A33" stroke="#B8A5FF" strokeOpacity=".35"/>
      <circle cx="91" cy="296" r="5" fill="#FF72C6"/>
      <path d="M106 112L185 164M401 108L351 151M422 265L352 239M109 286L173 248" stroke="#A991FF" strokeOpacity=".5" strokeDasharray="5 7"/>
      <rect x="145" y="102" width="230" height="158" rx="13" fill="#171421" stroke="#C9B9FF" strokeOpacity=".72" strokeWidth="2"/>
      <rect x="157" y="115" width="206" height="130" rx="6" fill="url(#workspaceScreen)"/>
      <path d="M179 217L220 181L247 198L293 154L338 176" stroke="#D8FF8F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="293" cy="154" r="6" fill="#FF72C6"/>
      <rect x="173" y="127" width="57" height="6" rx="3" fill="#E7DFFF" fillOpacity=".55"/>
      <rect x="173" y="139" width="82" height="4" rx="2" fill="#E7DFFF" fillOpacity=".24"/>
      <path d="M130 263H390L367 283H153L130 263Z" fill="#C7BAFF"/>
      <path d="M153 283H367L351 292H169L153 283Z" fill="#8064D9"/>
      <rect x="239" y="266" width="42" height="5" rx="2.5" fill="#7965B0"/>
      <path d="M236 146C236 123 252 106 274 106C297 106 313 124 313 147V169H236V146Z" fill="#242033"/>
      <path d="M245 147C245 128 257 116 275 116C294 116 306 129 306 148V162C306 181 294 194 275 194C257 194 245 181 245 162V147Z" fill="#F0B99D"/>
      <path d="M238 149C235 124 252 104 276 104C297 104 312 119 313 140C296 139 285 131 278 120C269 137 255 145 238 149Z" fill="#252236"/>
      <path d="M254 155C260 151 266 151 271 155M283 155C289 151 295 152 299 156" stroke="#342B43" strokeWidth="3" strokeLinecap="round"/>
      <path d="M267 171C272 175 279 175 284 171" stroke="#AF626F" strokeWidth="3" strokeLinecap="round"/>
      <path d="M235 196C247 185 259 180 275 180C293 180 306 188 317 202L332 259H216L225 211C227 205 230 200 235 196Z" fill="url(#workspaceJacket)" stroke="#D0C3FF" strokeWidth="2"/>
      <path d="M260 183L275 190L290 183L300 231L276 251L251 231L260 183Z" fill="#F7F4EF"/>
      <path d="M231 209L208 237M316 209L339 235" stroke="#F0B99D" strokeWidth="15" strokeLinecap="round"/>
      <path d="M237 251L220 280M309 251L329 279" stroke="#49357C" strokeWidth="20" strokeLinecap="round"/>
      <path d="M211 283H240M319 283H349" stroke="#D8CCFF" strokeWidth="7" strokeLinecap="round"/>
      <rect x="22" y="42" width="86" height="30" rx="8" fill="#211A33" stroke="#C6B4FF" strokeOpacity=".34"/>
      <circle cx="39" cy="57" r="4" fill="#B8A5FF"/><path d="M51 57H93" stroke="#E8E1FA" strokeOpacity=".68" strokeWidth="3" strokeLinecap="round"/>
      <rect x="382" y="324" width="104" height="31" rx="8" fill="#211A33" stroke="#C6B4FF" strokeOpacity=".34"/>
      <path d="M397 340H408L414 333L422 346L430 338H469" stroke="#B8A5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
