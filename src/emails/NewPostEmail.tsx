import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface NewPostEmailProps {
  title: string;
  link: string;
  description: string;
  image: string;
  imageAlt: string;
  unsubscribeUrl?: string;
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

export function NewPostEmail({
  title,
  link,
  description,
  image,
  imageAlt,
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
}: NewPostEmailProps) {
  return (
    <Html dir="ltr" lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <style>{`:root { color-scheme: dark; }`}</style>
      </Head>
      <Preview>{description}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: "#000000" }}>
        <Container
          style={{
            maxWidth: "600px",
            fontFamily,
            fontSize: "1.0769230769230769em",
            lineHeight: "155%",
          }}
        >
          {/* Title */}
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "2.25em",
              lineHeight: "1.44em",
              paddingTop: "0.389em",
              fontWeight: 600,
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "1em",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
              textAlign: "center",
            }}
          >
            <br />
          </Text>

          {/* Hero image — linked to article */}
          <Link href={link} style={{ color: "#067df7", textDecoration: "none" }}>
            <Img
              src={image}
              alt={imageAlt}
              width="100%"
              style={{
                display: "block",
                outline: "none",
                border: "none",
                textDecoration: "none",
                maxWidth: "100%",
                borderRadius: "8px",
              }}
            />
          </Link>

          {/* Bold description */}
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "1em",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
              color: "#FFFFFF",
              textAlign: "left",
            }}
          >
            <strong>{description}</strong>
          </Text>

          {/* Read Article link */}
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "1em",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
              color: "#FFFFFF",
              textAlign: "left",
            }}
          >
            <strong>
              <Link
                href={link}
                style={{
                  color: "#0670DB",
                  textDecoration: "underline",
                }}
              >
                Read Article
              </Link>
            </strong>
          </Text>
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "1em",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
            }}
          >
            <br />
          </Text>

          {/* Footer */}
          <Container style={{ fontSize: "0.8em" }}>
            <Hr
              style={{
                width: "100%",
                border: "none",
                borderTop: "1px solid #eaeaea",
                paddingBottom: "1em",
                borderWidth: "2px",
              }}
            />
            <Text
              style={{
                margin: 0,
                padding: 0,
                fontSize: "1em",
                paddingTop: "0.5em",
                paddingBottom: "0.5em",
                color: "#FFFFFF",
              }}
            >
              You are receiving this email because you opted in via our site.
              <br />
              <br />
              Want to change how you receive these emails?
              <br />
              You can{" "}
              <Link
                href={unsubscribeUrl}
                style={{
                  color: "#0670DB",
                  textDecoration: "underline",
                }}
              >
                unsubscribe from this list
              </Link>
              .
            </Text>
          </Container>
          <Text
            style={{
              margin: 0,
              padding: 0,
              fontSize: "1em",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
            }}
          >
            <br />
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
