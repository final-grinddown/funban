"use client"
import { useEffect, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { ERoutes } from "@/utils/enums"

interface SignInFormInputs {
  email: string
  password: string
}

export function SignInScreen() {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get("callbackUrl") || ERoutes.Landing
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInFormInputs>()

  const onSubmit = async (data: SignInFormInputs) => {
    setLoading(true)

    await signIn("credentials", {
      redirect: true,
      username: data.email,
      password: data.password,
      callbackUrl: callbackUrl,
    })
  }

  useEffect(() => {
    const error = searchParams?.get("error") ?? null

    if (error) {
      let errorMessage = "Failed to sign in."

      if (error === "CredentialsSignin") {
        errorMessage = "Invalid credentials."
      }

      setError("root", { type: "manual", message: errorMessage })
    }
  }, [searchParams, setError])

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card sx={{ maxWidth: 500, width: "100%" }}>
        <CardHeader
          title="Sign in to Funban"
          titleTypographyProps={{
            variant: "h2",
            component: "h1",
          }}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {errors.root && <Typography color="error">{errors.root.message}</Typography>}
              <TextField
                label="Email"
                type="email"
                variant="outlined"
                fullWidth
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
                    message: "Enter a valid email address",
                  },
                })}
                error={!!errors.email}
                helperText={errors.email ? errors.email.message : ""}
              />

              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                error={!!errors.password}
                helperText={errors.password ? errors.password.message : ""}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth={true}
                disabled={loading}
                sx={{ height: "44px" }}
              >
                {loading ? <CircularProgress size={24} /> : "Sign In"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  )
}
