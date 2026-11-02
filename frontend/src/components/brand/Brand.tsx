import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="GITNOVA home">
      <span className="brand-mark">
        <Sparkles size={15} />
      </span>
      <span>GITNOVA</span>
    </Link>
  );
}
