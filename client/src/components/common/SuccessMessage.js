import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

const SuccessMessage = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <Box mb={2}>
            <Alert
                severity="success"
                onClose={onClose}
                sx={{
                    '& .MuiAlert-message': {
                        whiteSpace: 'pre-wrap',
                    },
                }}
            >
                <AlertTitle>Success</AlertTitle>
                {message}
            </Alert>
        </Box>
    );
};

export default SuccessMessage;
