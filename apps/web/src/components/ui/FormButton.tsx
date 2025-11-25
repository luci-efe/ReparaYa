"use client";

import { Button } from "./Button";

interface FormButtonProps extends React.ComponentProps<typeof Button> {
    label: string;
}

export function FormButton({ label, ...props }: FormButtonProps) {
    return (
        <Button type="submit" {...props}>
            {label}
        </Button>
    );
}
