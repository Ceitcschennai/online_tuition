import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FeePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate("/payment-details", {
      replace: true,
      state: location.state,
    });
  }, [navigate, location.state]);

  return null;
};

export default FeePayment;