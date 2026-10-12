const fs = require('fs');
let content = fs.readFileSync('frontend/frontend/src/pages/ManagePayments.js', 'utf8');

// Get the actual block from the file
const startIdx = content.indexOf('{filteredPayments.map(');
const endIdx = content.indexOf('                </tbody>', startIdx);
const actualBlock = content.substring(startIdx, endIdx);

// Build new block based on actual block but with modifications
let newBlock = actualBlock
  // Add isSubmitted and isProcessing after className
  .replace(
    'const className =\n                        payment.student?.class ||\n                        payment.className ||\n                        "-";',
    'const className =\n                        payment.student?.class ||\n                        payment.className ||\n                        "-";\n\n                      const isSubmitted = payment.status === "Submitted";\n                      const isProcessing = processingPaymentId === payment._id;'
  )
  // Add submittedAt to the date display
  .replace(
    '{payment.paidAt\n                              ? formatDate(\n                                  payment.paidAt\n                                )\n                              : "-"}',
    '{payment.paidAt\n                              ? formatDate(\n                                  payment.paidAt\n                                )\n                              : payment.submittedAt\n                              ? formatDate(payment.submittedAt)\n                              : "-"}'
  )
  // Replace payment ID display
  .replace(
    '{payment.razorpayPaymentId ||\n                              payment.transactionReference ||\n                              "-"}',
    '{payment.razorpayPaymentId || payment.transactionReference || "-"}'
  )
  // Replace the entire action buttons section
  .replace(
    `{payment.status !==
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

                            )}`,
    `{isSubmitted && (
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
                                )}`
  );

const newContent = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
fs.writeFileSync('frontend/frontend/src/pages/ManagePayments.js', newContent);
console.log('Replacement successful');