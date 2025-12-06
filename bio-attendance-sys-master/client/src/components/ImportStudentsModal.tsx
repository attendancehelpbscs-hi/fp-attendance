import { useState, useCallback } from 'react';
import type { FC, ChangeEvent } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  Input,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  VStack,
} from '@chakra-ui/react';
import { UploadCloud, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useImportStudents } from '../api/student.api';
import { api } from '../api/api';
import type { ImportStudentsResult } from '../interfaces/api.interface';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportStudentsModal: FC<ImportStudentsModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportStudentsResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState<boolean>(false);
  const { mutateAsync: importStudents, isLoading } = useImportStudents();

  const resetState = useCallback(() => {
    setFile(null);
    setSummary(null);
    setDownloadingTemplate(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setSummary(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await api.get('/api/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Unable to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select a file to import');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await toast.promise(importStudents(formData), {
        loading: 'Importing students...',
        success: 'Import completed',
        error: (error) => error?.response?.data?.message ?? 'Import failed',
      });
      setSummary(response.data);
      setFile(null);
    } catch (error: any) {
      const details = error?.response?.data?.data as ImportStudentsResult | undefined;
      if (details) {
        setSummary(details);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Import Students</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.600">
              Upload a CSV or Excel file containing the columns Name, LRN/ID Number, Grade, and Section. Grade accepts either the level number (1-6) or labels like "Grade 1". Section should match an existing section code.
              <br />
              <strong>Important:</strong> When creating the CSV in Excel, format the LRN column as Text (right-click column → Format Cells → Text) before entering data to prevent number truncation.
            </Text>
            <Flex gap={3} align="center" flexWrap="wrap">
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} bg="white" />
              <Button
                variant="outline"
                leftIcon={<Download size={16} />}
                onClick={handleDownloadTemplate}
                isLoading={downloadingTemplate}
              >
                Download Template
              </Button>
            </Flex>
            {file && (
              <Box fontSize="sm" color="gray.700">
                Selected file: <strong>{file.name}</strong>
              </Box>
            )}
            <Button
              leftIcon={<UploadCloud size={16} />}
              bg="var(--bg-primary)"
              color="white"
              _hover={{ background: 'var(--bg-primary-light)' }}
              onClick={handleUpload}
              isDisabled={!file}
              isLoading={isLoading}
            >
              Upload and Import
            </Button>
            {summary && (
              <Box borderWidth="1px" borderRadius="md" padding={4} bg="gray.50">
                <Text fontWeight={600} marginBottom={2}>
                  Import Summary
                </Text>
                <Flex gap={4} marginBottom={summary.errorDetails.length ? 4 : 0} flexWrap="wrap">
                  <Badge colorScheme="green">Imported: {summary.imported}</Badge>
                  <Badge colorScheme={summary.errors ? 'red' : 'green'}>Rows with errors: {summary.errors}</Badge>
                </Flex>
                {summary.errorDetails.length > 0 && (
                  <Box maxH="250px" overflowY="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Row</Th>
                          <Th>Error</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {summary.errorDetails.map((detail, index) => (
                          <Tr key={`${detail.row}-${index}`}>
                            <Td>{detail.row}</Td>
                            <Td>{detail.error}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ImportStudentsModal;
