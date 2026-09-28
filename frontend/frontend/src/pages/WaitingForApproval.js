import React from "react";

const WaitingForApproval = () => {
  return (
    <div className="waiting-approval-page">

      <div className="waiting-approval-card">

        <div className="waiting-approval-icon">
          ⏳
        </div>

        <h1>
          Waiting for Admin Approval
        </h1>

        <p>
          Your account has been registered successfully.
        </p>

        <p>
          Please wait while the administrator reviews
          and approves your account.
        </p>

        <div className="waiting-approval-status">
          <span className="waiting-dot"></span>
          Approval Pending
        </div>

        <p className="waiting-approval-note">
          You can access your main dashboard only while
          your account is waiting for approval.
        </p>

      </div>

    </div>
  );
};

export default WaitingForApproval;