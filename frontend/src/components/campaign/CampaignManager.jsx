import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { Dialog } from "@headlessui/react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function CampaignPage() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = useForm();
  const [campaigns, setCampaigns] = useState([]);
  const [sending, setSending] = useState(false);
  const [smtpCon, setSmtpCon] = useState([]);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [timezoneOptions, setTimezoneOptions] = useState([
    { value: "local", label: "Local Browser Timezone" },
    { value: "America/New_York", label: "America/New_York (Eastern)" },
    { value: "America/Chicago", label: "America/Chicago (Central)" },
    { value: "America/Denver", label: "America/Denver (Mountain)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)" },
  ]);
  const hostname = import.meta.env.VITE_API_HOSTNAME;

  // Detect local timezone and add it to options on component mount
  useEffect(() => {
    try {
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (localTimezone) {
        // Update the "Local Browser Timezone" label to include the actual timezone
        const updatedOptions = timezoneOptions.map((option) =>
          option.value === "local"
            ? {
                value: localTimezone,
                label: `Local Browser Timezone (${localTimezone})`,
              }
            : option
        );
        setTimezoneOptions(updatedOptions);
      }
    } catch (error) {
      console.error("Error detecting local timezone:", error);
    }
  }, []);

  const fetchRecipients = async () => {
    try {
      const response = await fetch(
        `${hostname}api/recipient/getAllRecipientsEmails`
      );
      const data = await response.json();
      let formatData = [];
      for (let i = 0; i < data.emails.length; i++) {
        formatData.push({
          value: data.emails[i],
          label: data.emails[i],
        });
      }
      setRecipientOptions(formatData);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
    }
  };

  const fetchCampaigns = async () => {
    const response = await fetch(`${hostname}api/campaigns/getAll`);
    const data = await response.json();
    setCampaigns(data);
  };

  const fetchSmtp = async () => {
    try {
      const response = await fetch(`${hostname}api/smtp`);
      const data = await response.json();
      if (!data) console.log("Data not found");
      let formatData = data.map((smtp) => ({
        value: smtp.id,
        label: `${smtp.email}, ${smtp.port} ${smtp.host}`,
      }));
      setSmtpCon(formatData);
    } catch (e) {
      console.log(e);
    }
  };

  const createCampaign = async (data) => {
    try {
      const payload = {
        ...data,
        recipients: data.recipients.map((r) => r.value),
        smtpConfigs: data.smtpConfigs.map((s) => s.value),
        timezone: data.timezone.value,
      };
      console.log(payload);
      const response = await fetch(`${hostname}api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        fetchCampaigns();
        reset();

        // Clear specific fields if needed
        setValue("recipients", []);
        setValue("timezone", "");
        setValue("smtpConfigs", []);

        alert("Campaign created successfully!");
      } else {
        alert(result.error || "Error creating campaign");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to create campaign");
    }
  };

  const handleSendCampaign = async (id) => {
    setSending(true);
    const response = await fetch(`${hostname}api/campaigns/${id}/send`, {
      method: "POST",
    });
    const result = await response.json();
    if (response.ok) {
      alert("Campaign sent successfully!");
    } else {
      alert(result.error || "Error sending campaign");
    }
    setSending(false);
  };

  const handleSearchCampaigns = async () => {
    try {
      const response = await fetch(
        `${hostname}api/campaigns/search?subject=${searchTerm}`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setCampaigns(data);
      } else {
        console.error("Expected array, got:", data);
        setCampaigns([]); // fallback to avoid map crash
      }
    } catch (err) {
      console.error("Search failed:", err);
      setCampaigns([]); // avoid breaking the map()
      alert("Search failed");
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campaign?"))
      return;

    try {
      const response = await fetch(`${hostname}api/campaigns/delete/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCampaigns();
        alert("Campaign deleted");
      } else {
        alert("Failed to delete");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    // Populate form values
    setValue("subject", campaign.subject);
    setValue("body", campaign.body);
    setValue("sendAt", new Date(campaign.sendAt).toISOString().slice(0, 16));
    setValue(
      "recipients",
      campaign.recipients.map((email) => ({ label: email, value: email }))
    );
    setValue("timezone", {
      label: campaign.timezone,
      value: campaign.timezone,
    });
    setValue(
      "smtpConfigs",
      campaign.smtpConfigs.map((id) => {
        const match = smtpCon.find((s) => s.value === id);
        return match || { value: id, label: id };
      })
    );
  };

  const updateCampaign = async (data) => {
    try {
      const payload = {
        ...data,
        recipients: data.recipients.map((r) => r.value),
        smtpConfigs: data.smtpConfigs.map((s) => s.value),
        timezone: data.timezone.value,
      };
      const response = await fetch(
        `${hostname}api/campaigns/update/${editingCampaign.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (response.ok) {
        alert("Campaign updated");
        reset();
        fetchCampaigns();
        setEditingCampaign(null);
      } else {
        alert("Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  useEffect(() => {
    fetchRecipients();
    fetchCampaigns();
    fetchSmtp();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Campaign Manager</h1>
      {/* Create Campaign Form */}
      <form
        onSubmit={handleSubmit(
          editingCampaign ? updateCampaign : createCampaign
        )}
        className="space-y-4 mb-6 p-6 bg-white shadow-md rounded-md"
      >
        <div>
          <label className="block text-sm font-semibold">Subject</label>
          <input
            {...register("subject", { required: "Subject is required" })}
            type="text"
            className="w-full p-2 border rounded-md"
          />
          {errors.subject && (
            <p className="text-red-500 text-sm">{errors.subject.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold">Body</label>
          <textarea
            {...register("body", { required: "Body is required" })}
            className="w-full p-2 border rounded-md"
          />
        </div>
        {errors.body && (
          <p className="text-red-500 text-sm">{errors.body.message}</p>
        )}
        <div>
          <label className="block text-sm font-semibold">Recipients</label>
          <Controller
            name="recipients"
            control={control}
            rules={{ required: "At least one recipient is required" }}
            render={({ field }) => (
              <CreatableSelect
                {...field}
                isMulti
                options={recipientOptions}
                onChange={(selected) => field.onChange(selected)}
              />
            )}
          />
          {errors.recipients && (
            <p className="text-red-500 text-sm">{errors.recipients.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold">Send At</label>

          <input
            {...register("sendAt", { required: "Send time is required" })}
            type="datetime-local"
            className="w-full p-2 border rounded-md"
          />
          {errors.sendAt && (
            <p className="text-red-500 text-sm">{errors.sendAt.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold">Timezone</label>
          <Controller
            name="timezone"
            control={control}
            rules={{ required: "Timezone is required" }}
            render={({ field }) => (
              <Select
                {...field}
                options={timezoneOptions}
                onChange={(selected) => field.onChange(selected)}
                placeholder="Select timezone..."
              />
            )}
          />
          {errors.timezone && (
            <p className="text-red-500 text-sm">{errors.timezone.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold">
            SMTP Configurations
          </label>
          <Controller
            name="smtpConfigs"
            control={control}
            rules={{ required: "SMTP configurations are required" }}
            render={({ field }) => (
              <Select
                {...field}
                isMulti
                options={smtpCon}
                onChange={(selected) => field.onChange(selected)}
              />
            )}
          />
          {errors.smtpConfigs && (
            <p className="text-red-500 text-sm">{errors.smtpConfigs.message}</p>
          )}
        </div>
        <button
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          onClick={() => {
            const { subject, body } = getValues();
            setPreviewData({
              subject,
              body,
              unsubscribeLink: `${hostname}api/suppression`,
            });
            setIsOpen(true);
          }}
          type="button"
        >
          Live Preview
        </button>
        {isOpen && previewData && (
          <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow-lg">
                <Dialog.Title className="text-lg font-semibold mb-4">
                  Email Preview
                </Dialog.Title>

                <div className="border p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    Subject: <strong>{previewData.subject}</strong>
                  </p>
                  <hr className="my-2" />
                  <div
                    className="prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: previewData.body }}
                  />
                  <hr className="my-4" />
                  <p className="text-sm text-gray-500">
                    <a
                      href={previewData.unsubscribeLink}
                      className="text-blue-600 underline"
                    >
                      Unsubscribe
                    </a>
                  </p>
                </div>

                <div className="mt-6 text-right">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-600 hover:underline"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          {editingCampaign ? "Edit Campaign" : "Create Campaign"}
        </button>
      </form>

      {/* Search Functionality */}
      <div className="mb-4">
        <input
          id="search"
          name="search"
          type="text"
          placeholder="Search by subject..."
          className="w-full p-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchCampaigns();
          }}
        />
        <button
          onClick={handleSearchCampaigns}
          className="mt-2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
        >
          Search
        </button>
      </div>
      {/* List All Campaigns */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Campaigns</h2>
        {campaigns.length === 0 ? (
          <p>No campaigns found</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Recipients</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t">
                  <td className="px-4 py-2">{campaign.subject}</td>
                  <td className="px-4 py-2">
                    {campaign.recipients.join(", ")}
                  </td>
                  <td className="px-4 py-2">{campaign.status}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleSendCampaign(campaign.id)}
                      disabled={sending}
                      className="bg-green-500 text-white px-2 py-1 rounded mr-2 hover:bg-green-600"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => handleEditCampaign(campaign)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
