// synced from mysql-compare/src/renderer/components/ui — Doge Desktop Design System
// Barrel for the shared primitive package. Tokens live in ../../styles/tokens.css.

export * from './_internal/types';
export {
  useControllable,
  useDelayedFlag,
  useDismiss,
  useFloating,
  useFocusTrap,
  usePortal,
  useRovingTabIndex,
  isMac,
} from './_internal/hooks';

export { Button, buttonVariants, type ButtonProps, type ButtonVariant } from './button';
export { IconButton, type IconButtonProps } from './icon-button';
export { SplitButton, type SplitButtonProps } from './split-button';
export { Input, SearchInput, Textarea, type InputProps, type SearchInputProps, type TextareaProps } from './input';
export { Select, type SelectOption, type SelectProps } from './select';
export { Combobox, type ComboboxProps } from './combobox';
export { Checkbox, RadioGroup, Switch, type CheckboxProps, type RadioGroupProps, type SwitchProps } from './checkbox';
export { Field, Label, type FieldProps, type LabelProps } from './field';
export { Badge, StatusDot, type BadgeProps, type StatusDotProps } from './badge';
export { Kbd, formatChord, type KbdProps } from './kbd';
export { Spinner, Skeleton, type SpinnerProps, type SkeletonProps } from './spinner';

export { Popover, type PopoverProps } from './popover';
export { Tooltip, type TooltipProps } from './tooltip';
export { ContextMenu, DropdownMenu, type ContextMenuProps, type DropdownMenuProps } from './menu';
export { Panel, StatTile, type PanelProps, type StatTileProps } from './panel';
export { ScrollArea, type ScrollAreaProps } from './scroll-area';
export { ProgressBar, type ProgressBarProps } from './progress';

export { ConfirmDialog, Dialog, Drawer, type ConfirmDialogProps, type DialogProps, type DrawerProps } from './dialog';
export { Toaster, toast, type ToastOptions, type ToastTone } from './toast';
export { EmptyState, type EmptyStateProps, type EmptyStateVariant } from './empty-state';
export { Tabs, type TabItem, type TabsProps } from './tabs';
export { ToggleGroup, type ToggleGroupProps, type ToggleOption } from './toggle-group';

export { Toolbar, type ToolbarProps } from './toolbar';
export { TabStrip, type DocumentTab, type TabStripProps } from './tab-strip';
export {
  DataTable,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  type Column,
  type DataTableProps,
  type SortState,
} from './table';
export { TreeRow, type TreeRowProps } from './tree-row';
export { SplitPane, type SplitPaneProps } from './split-pane';
export {
  CommandPalette,
  type Command,
  type CommandGroup,
  type CommandPaletteProps,
} from './command-palette';

export { RuleEditor, normalizeRules, type RuleEditorProps, type RuleScope } from './rule-editor';
export { DiffGutter, type DiffGutterProps, type DiffKind } from './diff-gutter';
export { Chart, useChartTokens, type ChartProps, type ChartTokens, type ChartPerfEvent } from './chart';
