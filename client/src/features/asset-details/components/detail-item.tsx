/**
 * @file detail-item.tsx
 * @description A component for displaying a labeled detail value in the asset details view
 * @exports DetailItem
 * @feature asset-details
 */

type DetailItemProps = {
  label: string;
  value: string;
};

/**
 * Displays a labeled value for asset details
 */
export const DetailItem = ({ label, value }: DetailItemProps) => {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-md">{value}</p>
    </div>
  );
};
