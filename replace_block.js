const fs = require('fs');
let content = fs.readFileSync('frontend/frontend/src/pages/ManagePayments.js', 'utf8');

const oldBlock = `{filteredPayments.map(
                    (payment) => {

                      const studentName =
                        "\${payment.student?.firstName || \"\"} \${payment.student?.lastName || \"\"}".trim();

                      const className =
                        payment.student?.class ||
                        payment.className ||
                        "-";

                      return (
                        <tr
                          key={payment._id}
                        >

                          <td>
                            <strong>
                              {studentName ||
                                "-"}
                            </strong>
                          </td>

                          <td>
                            {className}
                          </td>

                          <td>
                            {formatMonth(
                              payment.paymentMonth
                            )}
                          </td>

                          <td className="amount-cell">
                            \u20B9
                            {(
                              payment.amountPaid ||
                              payment.monthlyFee ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            <span
                              className={"status-badge " + (payment.status?.toLowerCase() || "")}
                            >
                              {payment.status ||
                                "-"}
                            </span>
                          </td>

                          <td>
                            {payment.paidAt
                              ? formatDate(
                                  payment.paidAt
                                )
                              : "-"}
                          </td>

                          <td className="payment-id">
                            {payment.razorpayPaymentId ||
                              payment.transactionReference ||
                              "-"}
                          </td>

                          <td>

                            {payment.status !==
                            "Paid" ? (

                              <button
                                className="table-action primary"
                                onClick={() =>
                                  markAsPaid(
                                    payment._id
                                  )
                                }
                              >
                                Mark Paid
                              </button>

                            ) : (

                              <button
                                className="table-action secondary"
                                onClick={() =>
                                  downloadReceipt(
                                    payment
                                  )
                                }
                              >
                                Receipt
                              </button>

                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}`;

const newBlock = `{filteredPayments.map(
                    (payment) => {

                      const studentName =
                        "\${payment.student?.firstName || \"\"} \${payment.student?.lastName || \"\"}".trim();

                      const className =
                        payment.student?.class ||
                        payment.className ||
                        "-";

                      const isSubmitted = payment.status === "Submitted";
                      const isProcessing = processingPaymentId === payment._id;

                      return (
                        <tr
                          key={payment._id}
                        >
                          <td>
                            <strong>
                              {studentName || "-"}
                            </strong>
                          </td>

                          <td>
                            {className}
                          </td>

                          <td>
                            {formatMonth(payment.paymentMonth)}
                          </td>

                          <td className="amount-cell">
                            \u20B9
                            {(
                              payment.amountPaid ||
                              payment.monthlyFee ||
                              0
                            ).toLocaleString("en-IN")}
                          </td>

                          <td>
                            <span
                              className={"status-badge " + (payment.status?.toLowerCase() || "")}
                            >
                              {payment.status || "-"}
                            </span>
                          </td>

                          <td>
                            {payment.paidAt
                              ? formatDate(payment.paidAt)
                              : payment.submittedAt
                              ? formatDate(payment.submittedAt)
                              : "-"}
                          </td>

                          <td className="payment-id">
                            {payment.razorpayPaymentId || payment.transactionReference || "-"}
                          </td>

                          <td>
                            <div className="action-buttons-cell">
                              {isSubmitted && (
                                <>
                                  <button
                                    className="table-action primary"
                                    onClick={() => openPaymentDetail(payment)}
                                    disabled={isProcessing}
                                    title="Review payment proof"
                                  >
                                    Review
                                  </button>
                                </>
                              )}

                              {!isSubmitted && payment.status !== "Paid" && (
                                <button
                                  className="table-action primary"
                                  onClick={() => markAsPaid(payment._id)}
                                  disabled={isProcessing}
                                >
                                  Mark Paid
                                </button>
                              )}

                              {payment.status === "Paid" && (
                                <button
                                  className="table-action secondary"
                                  onClick={() => downloadReceipt(payment)}
                                  disabled={isProcessing}
                                >
                                  Receipt
                                </button>
                              )}

                              {(payment.status === "Rejected" || payment.status === "Paid") &&
                                payment.paymentScreenshot && (
                                  <button
                                    className="table-action secondary"
                                    onClick={() => openPaymentDetail(payment)}
                                    disabled={isProcessing}
                                    title="View payment proof"
                                  >
                                    View Proof
                                  </button>
                                )}
                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )}`;

if (content.includes(oldBlock)) {
    const newContent = content.replace(oldBlock, newBlock);
    fs.writeFileSync('frontend/frontend/src/pages/ManagePayments.js', newContent);
    console.log('Replacement successful');
} else {
    console.log('Old block not found exactly');
    // Try finding it
    const idx = content.indexOf('{filteredPayments.map(');
    if (idx >= 0) {
        const endIdx = content.indexOf('                </tbody>', idx);
        const actualBlock = content.substring(idx, endIdx);
        console.log('Actual block length:', actualBlock.length);
        console.log('Expected block length:', oldBlock.length);
        // Show first difference
        for (let i = 0; i < Math.min(actualBlock.length, oldBlock.length); i++) {
            if (actualBlock[i] !== oldBlock[i]) {
                console.log('Difference at', i, ':', JSON.stringify(actualBlock.substring(i, i+20)), 'vs', JSON.stringify(oldBlock.substring(i, i+20)));
                break;
            }
        }
    }
}