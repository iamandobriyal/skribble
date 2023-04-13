import { useRouter } from "next/router";
import User from "../components/user";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

const CodePage = () => {
  const router = useRouter();
  const [codeFound, setCodeFound] = useState(false);

  const { code } = router.query;
  useEffect(() => {
    if (code) {
      Cookies.set("gameCode", code);
      setCodeFound(true);
    }
  }, [code]);

  return (
    <User codeFound={codeFound} />
  );
};

export default CodePage;