"use client";

type PrintButtonProps = {
  label?: string;
  className?: string;
};

export function PrintButton({
  label = "Print",
  className = "ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target",
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}
